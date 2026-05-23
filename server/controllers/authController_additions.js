/**
 * ═══════════════════════════════════════════════════════════════════
 *  VaultFS — authController ADDITIONS (FIXED)
 *
 *  INTEGRATION:
 *  1. Import at top of authController.js:
 *       const PasswordReset = require("../models/PasswordReset");
 *       const crypto = require("crypto");
 *
 *  2. Paste these functions before module.exports in authController.js
 *
 *  3. Add to module.exports:
 *       forgotPassword, resetPassword,
 *       sendVerificationEmail, verifyEmail
 * ═══════════════════════════════════════════════════════════════════
 */

const crypto = require("crypto");   // ✅ ADDED
const bcrypt = require("bcryptjs"); // for password hashing (though we now rely on pre-save hook)
const User = require("../models/User");
const PasswordReset = require("../models/PasswordReset");
const { sendMail } = require("../utils/sendMail");

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always respond with success to prevent email enumeration
    const successMsg = "If an account exists with this email, a reset link has been sent.";

    if (!user) return res.json({ success: true, message: successMsg });

    // Invalidate old tokens for this user
    await PasswordReset.deleteMany({ userId: user._id });

    // Generate secure random token
    const rawToken  = crypto.randomBytes(32).toString("hex");
    const hashedTok = crypto.createHash("sha256").update(rawToken).digest("hex");

    await PasswordReset.create({
      userId:    user._id,
      token:     hashedTok,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}&id=${user._id}`;

    await sendMail({
      to:      user.email,
      subject: "Reset your VaultFS password",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0f0f13;border-radius:12px;border:1px solid #2a2a3d;color:#e2e2e8;">
          <h2 style="margin-top:0;color:#a78bfa;">Password Reset</h2>
          <p>Hi <strong>${user.displayName || user.username}</strong>,</p>
          <p>You requested a password reset. Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetUrl}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Reset Password</a>
          <p style="color:#888;font-size:13px;">If you did not request this, ignore this email — your password won't change.</p>
          <p style="color:#555;font-size:12px;margin-top:32px;">VaultFS Security · ${new Date().toUTCString()}</p>
        </div>
      `,
    });

    res.json({ success: true, message: successMsg });
  } catch (err) { next(err); }
};

// ── POST /api/auth/reset-password ────────────────────────────────────────────
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
      token:     hashedTok,
      used:      false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link. Please request a new one.",
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    // ✅ FIXED: Assign plain password – the pre-save hook will hash it automatically
    user.password = password;
    await user.save();

    // Mark token as used
    resetRecord.used = true;
    await resetRecord.save();

    // Invalidate all other reset tokens for this user
    await PasswordReset.deleteMany({ userId: user._id });

    // Notify via email
    await sendMail({
      to:      user.email,
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
  } catch (err) { next(err); }
};

// ── POST /api/auth/send-verification ─────────────────────────────────────────
const sendVerificationEmail = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.emailVerified) {
      return res.json({ success: true, message: "Email is already verified." });
    }

    const rawToken   = crypto.randomBytes(32).toString("hex");
    const hashedTok  = crypto.createHash("sha256").update(rawToken).digest("hex");

    // ✅ FIXED: Use correct field names from User model
    user.emailVerifyToken   = hashedTok;
    user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await user.save();

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${rawToken}&id=${user._id}`;

    await sendMail({
      to:      user.email,
      subject: "Verify your VaultFS email",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0f0f13;border-radius:12px;border:1px solid #2a2a3d;color:#e2e2e8;">
          <h2 style="margin-top:0;color:#a78bfa;">Verify Your Email</h2>
          <p>Hi <strong>${user.displayName || user.username}</strong>, welcome to VaultFS!</p>
          <p>Please verify your email address to unlock all features. This link expires in <strong>24 hours</strong>.</p>
          <a href="${verifyUrl}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Verify Email</a>
          <p style="color:#888;font-size:13px;">If you didn't create a VaultFS account, you can ignore this email.</p>
        </div>
      `,
    });

    res.json({ success: true, message: "Verification email sent. Check your inbox." });
  } catch (err) { next(err); }
};

// ── GET /api/auth/verify-email ────────────────────────────────────────────────
const verifyEmail = async (req, res, next) => {
  try {
    const { token, id } = req.query;
    if (!token || !id) {
      return res.status(400).json({ success: false, message: "Invalid verification link." });
    }

    const hashedTok = crypto.createHash("sha256").update(token).digest("hex");

    // ✅ FIXED: Use correct field names from User model
    const user = await User.findOne({
      _id:               id,
      emailVerifyToken:   hashedTok,
      emailVerifyExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification link. Please request a new one.",
      });
    }

    user.emailVerified    = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();

    res.json({ success: true, message: "Email verified successfully! You can now log in." });
  } catch (err) { next(err); }
};

module.exports = { forgotPassword, resetPassword, sendVerificationEmail, verifyEmail };