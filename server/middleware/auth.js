/**
 * middleware/auth.js
 * JWT authentication middleware for protected routes.
 *
 * protect      — requires valid token, sets req.user
 * optionalAuth — attaches user if token present, doesn't block if absent
 * requireAdmin — requires req.user.role === "admin"
 */
const jwt      = require("jsonwebtoken");
const User     = require("../models/User");

// ── protect ───────────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select("-password");
    if (!user)       return res.status(401).json({ success: false, message: "User not found." });
    if (user.banned) return res.status(403).json({ success: false, message: "Account suspended." });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

// ── optionalAuth ──────────────────────────────────────────────────────────────
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return next();
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
  } catch {
    // Token invalid — proceed without user
  }
  next();
};

// ── requireAdmin ──────────────────────────────────────────────────────────────
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required." });
  }
  next();
};

module.exports = { protect, optionalAuth, requireAdmin };
