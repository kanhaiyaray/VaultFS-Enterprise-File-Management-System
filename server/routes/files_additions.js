/**
 * server/routes/files_additions.js
 *
 * These routes should be ADDED to your existing server/routes/files.js.
 * Copy the relevant router.X() lines into the correct positions (see comments).
 *
 * Also add these imports at the top of files.js:
 *
 *   const { getShareInfo, accessShare }       = require("../controllers/shareController");
 *   const { bulkUpdateTags, createAdvancedShare } = require("../controllers/adminController");
 *   const { sendDownloadNotification }        = require("../controllers/notificationController");
 *   const { triggerWebhook }                   = require("../controllers/webhookController");
 */

const express    = require("express");
const { protect, optionalAuth } = require("../middleware/auth");
const { getShareInfo, accessShare }          = require("../controllers/shareController");
const { bulkUpdateTags, createAdvancedShare } = require("../controllers/adminController");

const router = express.Router();

// ── Public share link access ─────────────────────────────────────────────────
// Add BEFORE the "/:id" catch-all routes in files.js
router.get("/share/:token",          getShareInfo);   // public — metadata only
router.post("/share/:token/access",  accessShare);    // public — verify password + serve

// ── Bulk tag editor ──────────────────────────────────────────────────────────
// Add near the other bulk operations in files.js
router.post("/bulk-tags", protect, bulkUpdateTags);

// ── Advanced share link creation ─────────────────────────────────────────────
// Add with the other /:id routes in files.js
router.post("/:id/advanced-share", protect, createAdvancedShare);

module.exports = router;

/*
 * ─────────────────────────────────────────────────────────────────────────────
 *  HOW TO WIRE UP DOWNLOAD NOTIFICATIONS & WEBHOOKS IN downloadFile()
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  In fileController.js, at the end of the downloadFile handler,
 *  AFTER the file has been piped / sent, add:
 *
 *    // Fire-and-forget — never await in the response path
 *    sendDownloadNotification(file, req).catch(() => {});
 *    triggerWebhook(file.owner.toString(), "file.downloaded", {
 *      fileId:   file._id,
 *      fileName: file.originalName,
 *      by:       req.user?.id || "anonymous",
 *    }).catch(() => {});
 *
 *  And in uploadFiles(), after creating the File documents:
 *
 *    triggerWebhook(req.user.id, "file.uploaded", {
 *      files: uploadedFiles.map((f) => ({ id: f._id, name: f.originalName, size: f.size })),
 *    }).catch(() => {});
 *
 *  And in deleteFile():
 *
 *    triggerWebhook(req.user.id, "file.deleted", {
 *      fileId:   file._id,
 *      fileName: file.originalName,
 *    }).catch(() => {});
 *
 *  And in starFile():
 *
 *    triggerWebhook(req.user.id, "file.starred", {
 *      fileId:   file._id,
 *      fileName: file.originalName,
 *    }).catch(() => {});
 *
 *  And in restoreFile():
 *
 *    triggerWebhook(req.user.id, "file.restored", {
 *      fileId:   file._id,
 *      fileName: file.originalName,
 *    }).catch(() => {});
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  HOW TO WIRE UP FILE REQUEST NOTIFICATIONS IN filerequest.js submit handler
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  In server/routes/fileRequests.js (or fileRequestController.js),
 *  in the POST /:slug/submit handler, after saving the uploaded files:
 *
 *    const { sendMail } = require("../utils/email");
 *    const User = require("../models/User");
 *
 *    const owner = await User.findById(fileRequest.owner)
 *      .select("email displayName username notificationPrefs");
 *
 *    if (owner && owner.notificationPrefs?.emailOnFileRequest !== false) {
 *      await sendMail({
 *        to:      owner.email,
 *        subject: `New submission to "${fileRequest.title}"`,
 *        html: `
 *          <div style="font-family:sans-serif;max-width:520px;...">
 *            <h2>New File Submission</h2>
 *            <p>Hi <strong>${owner.displayName || owner.username}</strong>,</p>
 *            <p>Someone submitted <strong>${savedFiles.length}</strong> file(s) to your
 *               request "<strong>${fileRequest.title}</strong>".</p>
 *            ${uploaderEmail ? `<p>Uploader email: ${uploaderEmail}</p>` : ""}
 *            <a href="${process.env.CLIENT_URL}/file-requests">View Submissions</a>
 *          </div>
 *        `,
 *      }).catch(() => {});
 *    }
 *
 *  Also increment submissionCount on the fileRequest document:
 *    await FileRequest.findByIdAndUpdate(fileRequest._id, { $inc: { submissionCount: 1 } });
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  FULL app.js MOUNT SUMMARY (add these lines)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  app.use("/api/users",    require("./routes/users"));
 *  app.use("/api/branding", require("./routes/branding"));
 *  app.use("/api/admin",    require("./routes/admin"));
 *  app.use("/api/webhooks", require("./routes/webhooks"));
 *
 *  // In files.js, add share + bulk-tags + advanced-share routes (see above)
 *  // In auth.js, add: router.put("/change-password", protect, changePassword);
 */
