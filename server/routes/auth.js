/**
 * routes/auth.js
 * All VaultFS authentication endpoints.
 */
const express    = require("express");
const passport   = require("passport");
const jwt        = require("jsonwebtoken");
const { protect } = require("../middleware/auth");

const {
  register, login, getMe,
  setup2FA, verify2FA, verify2FALogin, disable2FA,
  forgotPassword, resetPassword,
  verifyEmail, resendVerification,
} = require("../controllers/authController");

// FIX 5: Import changePassword (was exported but never routed)
const { changePassword } = require("../controllers/notificationController");

const router = express.Router();

// ── Core ──────────────────────────────────────────────────────────────────────
router.post("/register", register);
router.post("/login",    login);
router.get("/me",        protect, getMe);

// FIX 5: Register the change-password route (was missing — SettingsPage got 404)
router.put("/change-password", protect, changePassword);

// ── Password reset ────────────────────────────────────────────────────────────
router.post("/forgot-password",     forgotPassword);
router.post("/reset-password",      resetPassword);

// ── Email verification ────────────────────────────────────────────────────────
router.get("/verify-email",         verifyEmail);
router.post("/resend-verification", protect, resendVerification);

// ── 2FA ───────────────────────────────────────────────────────────────────────
router.post("/2fa/setup",        protect, setup2FA);
router.post("/2fa/verify",       protect, verify2FA);
router.post("/2fa/verify-login", verify2FALogin);
router.post("/2fa/disable",      protect, disable2FA);

// ── OAuth — Google ────────────────────────────────────────────────────────────
router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false }));
router.get("/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=oauth` }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
    res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/oauth-callback?token=${token}`);
  }
);

// ── OAuth — GitHub ────────────────────────────────────────────────────────────
router.get("/github",
  passport.authenticate("github", { scope: ["user:email"], session: false }));
router.get("/github/callback",
  passport.authenticate("github", { session: false, failureRedirect: `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=oauth` }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
    res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/oauth-callback?token=${token}`);
  }
);

module.exports = router;