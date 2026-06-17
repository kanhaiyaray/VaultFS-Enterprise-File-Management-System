/**
 * routes/auth.js
 * All VaultFS authentication endpoints.
 */
const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { protect } = require("../middleware/auth");

const {
  register, login, getMe,
  setup2FA, verify2FA, verify2FALogin, disable2FA,
  forgotPassword, resetPassword,
  verifyEmail, resendVerification,
} = require("../controllers/authController");

const { changePassword } = require("../controllers/notificationController");

const router = express.Router();

// ── Rate limiters ────────────────────────────────────────────────────────────
// Stricter limits for authentication endpoints to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
});

// Slightly looser for registration (new users) – still protected
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    success: false,
    message: "Too many registration attempts. Please try again later.",
  },
});

// ── Core ──────────────────────────────────────────────────────────────────────
router.post("/register", registerLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", protect, getMe);

router.put("/change-password", protect, changePassword);

// ── Password reset ────────────────────────────────────────────────────────────
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);

// ── Email verification ────────────────────────────────────────────────────────
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", protect, resendVerification);

// ── 2FA ───────────────────────────────────────────────────────────────────────
router.post("/2fa/setup", protect, setup2FA);
router.post("/2fa/verify", protect, verify2FA);
router.post("/2fa/verify-login", verify2FALogin);
router.post("/2fa/disable", protect, disable2FA);

// ── Suspicious login verification ────────────────────────────────────────────
router.post("/verify-suspicious", async (req, res, next) => {
  try {
    const { token, confirm } = req.body;
    if (!token || !confirm) {
      return res.status(400).json({ success: false, message: "Invalid verification request." });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require("../models/User");
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    
    const Device = require("../models/Device");
    const device = await Device.findOne({ user: user._id, fingerprint: decoded.fingerprint });
    if (device) {
      device.isTrusted = true;
      device.isSuspicious = false;
      device.suspicionReason = null;
      await device.save();
    }
    
    const authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, token: authToken, message: "Device verified successfully." });
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid or expired verification token." });
    }
    next(err);
  }
});

// ── OAuth configuration flags ────────────────────────────────────────────────
const googleEnabled = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
const githubEnabled = !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET;

// ── OAuth — Google ────────────────────────────────────────────────────────────
if (googleEnabled) {
  router.get("/google",
    passport.authenticate("google", { scope: ["profile", "email"], session: false }));

  router.get("/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=oauth` }),
    (req, res) => {
      const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
      res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/oauth-callback?token=${token}`);
    }
  );
} else {
  router.get("/google", (req, res) => res.status(503).json({ success: false, message: "Google OAuth is not configured on the server." }));
  router.get("/google/callback", (req, res) => res.status(503).send("Google OAuth is not configured on the server."));
}

// ── OAuth — GitHub ────────────────────────────────────────────────────────────
if (githubEnabled) {
  router.get("/github",
    passport.authenticate("github", { scope: ["user:email"], session: false }));

  router.get("/github/callback",
    passport.authenticate("github", { session: false, failureRedirect: `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=oauth` }),
    (req, res) => {
      const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
      res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/oauth-callback?token=${token}`);
    }
  );
} else {
  router.get("/github", (req, res) => res.status(503).json({ success: false, message: "GitHub OAuth is not configured on the server." }));
  router.get("/github/callback", (req, res) => res.status(503).send("GitHub OAuth is not configured on the server."));
}

module.exports = router;