/**
 * ═══════════════════════════════════════════════════════════════════
 *  VaultFS — Download Notification + Notification Preferences
 *
 *  Integration into fileController.js downloadFile handler:
 *
 *  1. Import at top of fileController.js:
 *       const { sendDownloadNotification } = require("./notificationController");
 *
 *  2. In downloadFile, after serving the file and updating access log, add:
 *       await sendDownloadNotification(file, req);
 *
 *  3. Copy this file to server/controllers/notificationController.js
 *
 *  4. Add to User model:
 *       notificationPrefs: { ... }
 *
 *  5. Add to user routes (server/routes/users.js or auth.js):
 *       router.put("/me/notification-prefs", protect, updateNotificationPrefs);
 *       router.get("/me",                    protect, getMe);
 *       router.put("/me",                    protect, updateMe);
 *       router.delete("/me",                 protect, deleteMe);
 *       router.get("/me/export",             protect, exportUserData);
 * ═══════════════════════════════════════════════════════════════════
 */

const User = require("../models/User");
const File = require("../models/File");
const { sendMail, emails } = require("../utils/sendMail");   // ✅ added emails

// ── sendDownloadNotification ──────────────────────────────────────────────────
// Called from downloadFile in fileController.js
async function sendDownloadNotification(file, req) {
  try {
    const owner = await User.findById(file.owner).select("email displayName username notificationPrefs");
    if (!owner) return;
    if (!owner.notificationPrefs?.emailOnDownload) return;

    // Don't notify owner downloading their own file
    if (req.user && req.user.id === file.owner.toString()) return;

    const downloaderInfo = req.user
      ? `${req.user.username || "a registered user"} (${req.user.email || ""})`
      : `an anonymous visitor (IP: ${req.ip || "unknown"})`;

    // ✅ use emails.fileDownloaded template
    const mail = emails.fileDownloaded(owner.displayName || owner.username, file.originalName, downloaderInfo);
    await sendMail({ to: owner.email, ...mail });
  } catch {
    // Non-fatal — never let notification failure break the download
  }
}

// ── sendShareNotification ─────────────────────────────────────────────────────
// Called from createAdvancedShare or getSignedUrl in fileController.js
async function sendShareNotification(file, shareUrl, req) {
  try {
    const owner = await User.findById(file.owner).select("email displayName username notificationPrefs");
    if (!owner?.notificationPrefs?.emailOnShare) return;

    await sendMail({
      to:      owner.email,
      subject: `Share link created: ${file.originalName}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0f0f13;border-radius:12px;border:1px solid #2a2a3d;color:#e2e2e8;">
          <h2 style="margin-top:0;color:#a78bfa;">Share Link Created</h2>
          <p>Hi <strong>${owner.displayName || owner.username}</strong>,</p>
          <p>A share link was created for <strong>${file.originalName}</strong>.</p>
          <a href="${shareUrl}" style="display:inline-block;margin:16px 0;padding:10px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;">View Share Link</a>
          <p style="color:#888;font-size:13px;">If you didn't create this, please revoke the link from your dashboard.</p>
        </div>
      `,
    });
  } catch {}
}

// ── User profile endpoints (add to server/routes/users.js) ───────────────────

// PUT /api/users/me/notification-prefs
const updateNotificationPrefs = async (req, res, next) => {
  try {
    const allowed = [
      "emailOnDownload","emailOnShare","emailOnFileRequest",
      "emailOnLogin","emailWeeklySummary","inAppActivity","inAppAnnouncements",
    ];
    const prefs = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) prefs[`notificationPrefs.${k}`] = !!req.body[k]; });

    const user = await User.findByIdAndUpdate(req.user.id, { $set: prefs }, { new: true }).select("-password -twoFactorSecret -emailVerifyToken");
    res.json({ success: true, user, message: "Notification preferences updated." });
  } catch (err) { next(err); }
};

// GET /api/users/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password -twoFactorSecret -emailVerifyToken");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

// PUT /api/users/me
const updateMe = async (req, res, next) => {
  try {
    const allowed = ["displayName", "bio", "avatarUrl"];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select("-password -twoFactorSecret");
    res.json({ success: true, user, message: "Profile updated." });
  } catch (err) { next(err); }
};

// DELETE /api/users/me
const deleteMe = async (req, res, next) => {
  try {
    const fs   = require("fs");
    const File = require("../models/File");

    const files = await File.find({ owner: req.user.id });
    for (const f of files) {
      try {
        if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
        if (f.thumbnailPath && fs.existsSync(f.thumbnailPath)) fs.unlinkSync(f.thumbnailPath);
      } catch {}
    }
    await File.deleteMany({ owner: req.user.id });
    await User.findByIdAndDelete(req.user.id);

    res.json({ success: true, message: "Account deleted." });
  } catch (err) { next(err); }
};

// GET /api/users/me/export  (basic JSON/CSV export)
const exportUserData = async (req, res, next) => {
  try {
    const user  = await User.findById(req.user.id).select("-password -twoFactorSecret -emailVerifyToken");
    const files = await File.find({ owner: req.user.id, isDeleted: false }).select("-path -thumbnailPath");

    const exportData = {
      exportedAt: new Date().toISOString(),
      user:       user.toObject(),
      files:      files.map((f) => f.toObject()),
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=vaultfs-export-${Date.now()}.json`);
    res.json(exportData);
  } catch (err) { next(err); }
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Both fields are required." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters." });
    }

    const bcrypt = require("bcryptjs");
    const user   = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Current password is incorrect." });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password changed successfully." });
  } catch (err) { next(err); }
};

module.exports = {
  sendDownloadNotification,
  sendShareNotification,
  updateNotificationPrefs,
  getMe,
  updateMe,
  deleteMe,
  exportUserData,
  changePassword,
};