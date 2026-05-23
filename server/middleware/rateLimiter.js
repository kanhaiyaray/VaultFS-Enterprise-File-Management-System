/**
 * middleware/rateLimiter.js
 * Rate limiting for upload, download, and general API endpoints.
 */
const rateLimit = require("express-rate-limit");

// ── Upload: 10 files per minute per user ──────────────────────────────────────
const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { success: false, message: "Upload rate limit reached. Please wait before uploading more files." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Download: 30 per minute ───────────────────────────────────────────────────
const downloadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { success: false, message: "Download rate limit reached. Please try again in a moment." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Bandwidth tracker (rough logging, not enforced yet) ──────────────────────
const bandwidthTracker = (req, res, next) => {
  const start = Date.now();
  const originalEnd = res.end.bind(res);
  res.end = (...args) => {
    const bytes    = parseInt(res.getHeader("content-length") || "0");
    const duration = Date.now() - start;
    // Could log to DB / emit event here for bandwidth analytics
    return originalEnd(...args);
  };
  next();
};

// ── General API limit: 200 req/15min ─────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

module.exports = { uploadRateLimiter, downloadRateLimiter, bandwidthTracker, apiLimiter };
