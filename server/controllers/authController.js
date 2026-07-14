/**
 * controllers/authController.js
 * VaultFS — Full authentication controller.
 * Handles: register, login, me, OAuth callbacks, 2FA setup/verify/disable,
 *          forgot-password, reset-password, email verification.
 *          PLUS: Device fingerprinting & suspicious login detection
 */

const Device = require('../models/Device');
const UAParser = require('ua-parser-js');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const User = require("../models/User");
const PasswordReset = require("../models/PasswordReset");
const { sendMail, emails } = require("../utils/sendMail");
const { logActivity } = require("../utils/activityLogger");

// ── Helpers ───────────────────────────────────────────────────────────────────
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const sanitizeUser = (user) => {
  const obj = user.toJSON ? user.toJSON() : { ...user._doc };
  delete obj.password;
  delete obj.twoFactorSecret;
  delete obj.emailVerifyToken;
  return obj;
};

// ── Detect suspicious login ───────────────────────────────────────────────────
const detectSuspiciousLogin = async (user, fingerprint, deviceInfo, ipAddress) => {
  const existingDevices = await Device.find({ user: user._id });
  const knownDevice = existingDevices.find(d => d.fingerprint === fingerprint);
  
  if (knownDevice && knownDevice.isTrusted) {
    knownDevice.lastSeenAt = new Date();
    knownDevice.loginCount += 1;
    knownDevice.ipAddress = ipAddress;
    await knownDevice.save();
    return { isSuspicious: false };
  }
  
  let suspicionScore = 0;
  let reasons = [];
  
  if (!knownDevice) {
    suspicionScore += 40;
    reasons.push('New device detected');
  } else if (!knownDevice.isTrusted) {
    suspicionScore += 20;
    reasons.push('Untrusted device');
  }
  
  const parser = new UAParser(deviceInfo?.userAgent);
  const os = parser.getOS();
  
  if (existingDevices.length > 0) {
    const lastDevice = existingDevices[0];
    if (lastDevice.timezone && deviceInfo?.timezone !== lastDevice.timezone) {
      suspicionScore += 15;
      reasons.push('Timezone changed significantly');
    }
    if (lastDevice.platform && deviceInfo?.platform !== lastDevice.platform) {
      suspicionScore += 10;
      reasons.push('Different operating system');
    }
  }
  
  const recentLogins = existingDevices.filter(d => 
    d.lastSeenAt > new Date(Date.now() - 5 * 60 * 1000)
  ).length;
  if (recentLogins > 3) {
    suspicionScore += 20;
    reasons.push('Multiple logins in short period');
  }
  
  const isSuspicious = suspicionScore >= 50;
  
  if (knownDevice) {
    knownDevice.lastSeenAt = new Date();
    knownDevice.loginCount += 1;
    knownDevice.ipAddress = ipAddress;
    knownDevice.isSuspicious = isSuspicious;
    knownDevice.suspicionReason = isSuspicious ? reasons.join('; ') : null;
    await knownDevice.save();
  } else {
    await Device.create({
      user: user._id,
      fingerprint,
      userAgent: deviceInfo?.userAgent,
      platform: deviceInfo?.platform || os.name,
      language: deviceInfo?.language,
      screenResolution: deviceInfo?.screenResolution,
      timezone: deviceInfo?.timezone,
      hardwareConcurrency: deviceInfo?.hardwareConcurrency,
      deviceMemory: deviceInfo?.deviceMemory,
      touchSupport: deviceInfo?.touchSupport,
      ipAddress,
      loginCount: 1,
      isSuspicious,
      suspicionReason: isSuspicious ? reasons.join('; ') : null,
    });
  }
  
  return { isSuspicious, reasons, suspicionScore };
};

// ── Send suspicious login email ───────────────────────────────────────────────
const sendSuspiciousLoginEmail = async (user, reasons, ipAddress, deviceInfo) => {
  const reasonsHtml = reasons.map(r => `<li style="margin: 5px 0">${r}</li>`).join('');
  
  await sendMail({
    to: user.email,
    subject: '⚠️ Suspicious login detected on your VaultFS account',
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #0f0f13; border-radius: 12px; border: 1px solid #2a2a3d;">
        <h2 style="color: #f59e0b; margin-top: 0;">Suspicious Login Alert</h2>
        <p>Hi <strong>${user.displayName || user.username}</strong>,</p>
        <p>We detected a login to your VaultFS account that looks unusual:</p>
        <ul style="background: #1a1a27; padding: 16px 24px; border-radius: 8px;">${reasonsHtml}</ul>
        <div style="background: #1a1a27; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px"><strong>Device details:</strong></p>
          <p style="margin: 0; color: #a1a1aa; font-size: 12px;">${deviceInfo?.userAgent || 'Unknown'}</p>
          <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 12px;">IP: ${ipAddress}</p>
        </div>
        <p style="margin: 16px 0;">If this was you, you can verify this device in your security settings.</p>
        <a href="${process.env.CLIENT_URL}/settings?tab=security" 
           style="display: inline-block; margin: 8px 0; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">
          Review Security Settings
        </a>
        <p style="color: #71717a; font-size: 12px; margin-top: 24px;">
          If you didn't attempt this login, please change your password immediately.
        </p>
      </div>
    `
  });
};

// ── POST /api/auth/register ───────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ success: false, message: "Username, email and password are required." });
    if (password.length < 8)
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });

    const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (exists) {
      const field = exists.email === email.toLowerCase() ? "Email" : "Username";
      return res.status(409).json({ success: false, message: `${field} already in use.` });
    }

    // Build email verify token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedTok = crypto.createHash("sha256").update(rawToken).digest("hex");

    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password,
      displayName: displayName?.trim() || username.trim(),
      emailVerifyToken: hashedTok,
      emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      emailVerified: false,
    });

    // Send verification email
    try {
      const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${rawToken}&id=${user._id}`;
      const mail = emails.verifyEmail(user.displayName || user.username, verifyUrl);
      await sendMail({ to: user.email, ...mail });
    } catch (mailErr) {
      console.warn("[register] Failed to send verify email:", mailErr.message);
    }

    const token = signToken(user._id);
    return res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(user),
      message: "Account created. Please check your email to verify.",
    });
  } catch (err) { next(err); }
};

// ── POST /api/auth/login ── UPDATED: support email OR username ──────────────
const login = async (req, res, next) => {
  try {
    const { email, password, fingerprint, deviceInfo } = req.body;

    // identifier can be email or username
    const identifier = email?.trim();
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Email/username and password are required." });
    }

    // Build query: match either email (case-insensitive) or username (case-insensitive exact)
    const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = {
      $or: [
        { email: identifier.toLowerCase() },
        { username: { $regex: new RegExp(`^${escapedIdentifier}$`, 'i') } }
      ]
    };

    const user = await User.findOne(query).select("+password +twoFactorSecret");
    if (!user || !user.password) {
      return res.status(401).json({ success: false, message: "Invalid email/username or password." });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid email/username or password." });
    }

    if (user.isBanned) {
      return res.status(403).json({ success: false, message: user.banReason || "Account suspended." });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const suspicion = await detectSuspiciousLogin(user, fingerprint, deviceInfo, ipAddress);

    if (suspicion.isSuspicious) {
      const suspiciousToken = jwt.sign(
        { 
          id: user._id, 
          reason: suspicion.reasons,
          fingerprint: fingerprint
        },
        process.env.JWT_SECRET,
        { expiresIn: "30m" }
      );
      await sendSuspiciousLoginEmail(user, suspicion.reasons, ipAddress, deviceInfo);
      return res.status(403).json({
        success: false,
        requiresVerification: true,
        suspiciousToken,
        message: "Suspicious login detected. Check your email for verification.",
        reasons: suspicion.reasons
      });
    }

    // 2FA check
    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign({ id: user._id, pending2FA: true }, process.env.JWT_SECRET, { expiresIn: "10m" });
      return res.json({ success: true, requires2FA: true, userId: user._id, tempToken });
    }

    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip;
    await user.save();
    logActivity(req, user._id, "login", { email: user.email });

    const token = signToken(user._id);
    return res.json({ success: true, token, user: sanitizeUser(user) });
  } catch (err) { next(err); }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    return res.json({ success: true, user: sanitizeUser(user) });
  } catch (err) { next(err); }
};

// ── POST /api/auth/2fa/setup ──────────────────────────────────────────────────
const setup2FA = async (req, res, next) => {
  try {
    const secret = speakeasy.generateSecret({ name: `VaultFS (${req.user.email})`, length: 20 });
    await User.findByIdAndUpdate(req.user.id, { twoFactorSecret: secret.base32 });
    const qrUrl = await QRCode.toDataURL(secret.otpauth_url);
    return res.json({ success: true, secret: secret.base32, qrCode: qrUrl });
  } catch (err) { next(err); }
};

// ── POST /api/auth/2fa/verify ─────────────────────────────────────────────────
const verify2FA = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id).select("+twoFactorSecret");
    if (!user?.twoFactorSecret)
      return res.status(400).json({ success: false, message: "2FA not set up." });

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 1,
    });
    if (!valid)
      return res.status(400).json({ success: false, message: "Invalid 2FA code." });

    user.twoFactorEnabled = true;
    await user.save();
    return res.json({ success: true, message: "2FA enabled." });
  } catch (err) { next(err); }
};

// ── POST /api/auth/2fa/verify-login ──────────────────────────────────────────
const verify2FALogin = async (req, res, next) => {
  try {
    const { userId, token } = req.body;
    const user = await User.findById(userId).select("+twoFactorSecret");
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 1,
    });
    if (!valid)
      return res.status(400).json({ success: false, message: "Invalid 2FA code." });

    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip;
    await user.save();

    const jwtToken = signToken(user._id);
    return res.json({ success: true, token: jwtToken, user: sanitizeUser(user) });
  } catch (err) { next(err); }
};

// ── POST /api/auth/2fa/disable ────────────────────────────────────────────────
const disable2FA = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id).select("+twoFactorSecret");
    if (!user?.twoFactorEnabled)
      return res.status(400).json({ success: false, message: "2FA is not enabled." });

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 1,
    });
    if (!valid)
      return res.status(400).json({ success: false, message: "Invalid 2FA code." });

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();
    return res.json({ success: true, message: "2FA disabled." });
  } catch (err) { next(err); }
};

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required." });

    const successMsg = "If an account exists with this email, a reset link has been sent.";
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) return res.json({ success: true, message: successMsg });

    await PasswordReset.deleteMany({ userId: user._id });

    const rawToken  = crypto.randomBytes(32).toString("hex");
    const hashedTok = crypto.createHash("sha256").update(rawToken).digest("hex");

    await PasswordReset.create({
      userId:    user._id,
      token:     hashedTok,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}&id=${user._id}`;

    try {
      const mail = emails.forgotPassword(user.displayName || user.username, resetUrl);
      await sendMail({ to: user.email, ...mail });
    } catch (emailErr) {
      console.error("[forgotPassword] Email sending failed:", emailErr.message);
    }

    res.json({ success: true, message: successMsg });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token, userId, password } = req.body;

    if (!token || !userId || !password) {
      return res.status(400).json({ success: false, message: "Token, userId, and password are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    }

    const hashedTok = crypto.createHash("sha256").update(token).digest("hex");

    const resetRecord = await PasswordReset.findOne({
      userId,
      token: hashedTok,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link. Please request a new one.",
      });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    user.password = password;
    await user.save();

    resetRecord.used = true;
    await resetRecord.save();

    await PasswordReset.deleteMany({ userId: user._id });

    await sendMail({
      to: user.email,
      subject: "Your VaultFS password was changed",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0f0f13;border-radius:12px;border:1px solid #2a2a3d;color:#e2e2e8;">
          <h2 style="margin-top:0;color:#a78bfa;">Password Changed</h2>
          <p>Hi <strong>${user.displayName || user.username}</strong>,</p>
          <p>Your VaultFS password was successfully reset on <strong>${new Date().toLocaleString()}</strong>.</p>
          <p style="color:#ef4444;">If you did not do this, please contact support immediately and secure your email account.</p>
        </div>
      `,
    });

    res.json({ success: true, message: "Password reset successfully. You can now log in." });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/auth/verify-email ────────────────────────────────────────────────
const verifyEmail = async (req, res, next) => {
  try {
    const { token, id } = req.query;
    if (!token || !id)
      return res.status(400).json({ success: false, message: "Token and id are required." });

    const hashedTok = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      _id: id,
      emailVerifyToken: hashedTok,
      emailVerifyExpires: { $gt: new Date() },
    }).select("+emailVerifyToken");

    if (!user)
      return res.status(400).json({ success: false, message: "Verification link is invalid or has expired." });

    user.emailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();

    return res.json({ success: true, message: "Email verified successfully." });
  } catch (err) { next(err); }
};

// ── POST /api/auth/resend-verification ───────────────────────────────────────
const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("+emailVerifyToken");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.emailVerified) return res.json({ success: true, message: "Email already verified." });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedTok = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.emailVerifyToken = hashedTok;
    user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${rawToken}&id=${user._id}`;
    const mail = emails.verifyEmail(user.displayName || user.username, verifyUrl);
    await sendMail({ to: user.email, ...mail });

    return res.json({ success: true, message: "Verification email resent." });
  } catch (err) { next(err); }
};

module.exports = {
  register,
  login,
  getMe,
  setup2FA,
  verify2FA,
  verify2FALogin,
  disable2FA,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};