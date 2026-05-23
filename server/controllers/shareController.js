/**
 * controllers/shareController.js
 * Public share-link endpoints — matches File model's flat share fields:
 *   shareToken, shareExpiry, sharePassword (select:false), shareMaxDownloads,
 *   shareDownloadCount, shareViewOnly
 *
 * Routes (registered in server/routes/files.js):
 *   GET  /api/files/share/:token         — public metadata
 *   POST /api/files/share/:token/access  — password verify + signed access token
 *
 * Security model:
 *   Password-protected files: accessShare verifies the password and issues a
 *   short-lived JWT (5 min) containing { fileId }. The client appends it as
 *   ?accessToken=<jwt> on the download URL. downloadFile verifies the JWT before
 *   serving the file — so anyone who doesn't know the password cannot download
 *   by guessing the file _id.
 *
 *   The shareDownloadCount is incremented ONLY in downloadFile (not here),
 *   so each actual download is counted exactly once.
 */

const File = require("../models/File");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ── GET /api/files/share/:token ───────────────────────────────────────────────
const getShareInfo = async (req, res, next) => {
  try {
    const { token } = req.params;

    const file = await File.findOne({ shareToken: token, isDeleted: false })
      .select("originalName mimetype size description tags thumbnailUrl shareExpiry shareMaxDownloads shareDownloadCount shareViewOnly sharePassword");

    if (!file) return res.status(404).json({ success: false, message: "Share link not found or has been revoked." });

    // Expiry check
    if (file.shareExpiry && new Date(file.shareExpiry) < new Date())
      return res.status(410).json({ success: false, message: "This share link has expired.", expired: true });

    // Download limit
    if (file.shareMaxDownloads != null && file.shareDownloadCount >= file.shareMaxDownloads)
      return res.status(410).json({ success: false, message: `Download limit (${file.shareMaxDownloads}) reached.`, limitReached: true });

    const hasPassword = !!file.sharePassword;
    const payload = {
      success: true,
      file: {
        _id:          file._id,
        originalName: file.originalName,
        mimetype:     file.mimetype,
        size:         file.size,
        description:  file.description,
        tags:         file.tags,
        thumbnailUrl: file.thumbnailUrl,
      },
      passwordProtected: hasPassword,
      viewOnly:          file.shareViewOnly,
      expiresAt:         file.shareExpiry,
      downloadsRemaining: file.shareMaxDownloads != null
        ? Math.max(0, file.shareMaxDownloads - file.shareDownloadCount)
        : null,
    };

    // FIX 3: Only expose downloadUrl for non-password, non-viewOnly shares.
    // view-only shares must NOT get a downloadUrl (backend also enforces this,
    // but no need to expose the URL at all).
    if (!hasPassword && !file.shareViewOnly) {
      payload.downloadUrl = `/api/files/download/${file._id}`;
      if (file.thumbnailUrl) payload.previewUrl = file.thumbnailUrl;
    }

    return res.json(payload);
  } catch (err) { next(err); }
};

// ── POST /api/files/share/:token/access ──────────────────────────────────────
const accessShare = async (req, res, next) => {
  try {
    const { token }    = req.params;
    const { password } = req.body;

    const file = await File.findOne({ shareToken: token, isDeleted: false })
      .select("+sharePassword");

    if (!file) return res.status(404).json({ success: false, message: "Share link not found." });

    // Expiry
    if (file.shareExpiry && new Date(file.shareExpiry) < new Date())
      return res.status(410).json({ success: false, message: "This link has expired." });

    // Download limit
    if (file.shareMaxDownloads != null && file.shareDownloadCount >= file.shareMaxDownloads)
      return res.status(410).json({ success: false, message: "Download limit reached." });

    // Password check
    if (file.sharePassword) {
      if (!password) return res.status(401).json({ success: false, message: "Password required." });
      const match = await bcrypt.compare(password, file.sharePassword);
      if (!match) return res.status(401).json({ success: false, message: "Incorrect password." });
    }

    // FIX 1 + 2: Issue a short-lived signed access token so downloadFile can
    // confirm that the password was correctly verified here. The download count
    // is NOT incremented here — downloadFile handles it (once, not twice).
    const accessToken = jwt.sign(
      { fileId: file._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }   // generous enough for slow connections
    );

    const downloadUrl = file.shareViewOnly
      ? null
      : `/api/files/download/${file._id}?accessToken=${accessToken}`;

    let previewUrl = file.thumbnailUrl || null;
    if (!previewUrl && (
      file.mimetype?.startsWith("image/") ||
      file.mimetype?.startsWith("video/") ||
      file.mimetype?.startsWith("audio/") ||
      file.mimetype === "application/pdf"
    )) { previewUrl = downloadUrl; }

    return res.json({
      success:     true,
      file: {
        _id:          file._id,
        originalName: file.originalName,
        mimetype:     file.mimetype,
        size:         file.size,
        description:  file.description,
      },
      viewOnly:    file.shareViewOnly,
      downloadUrl,
      previewUrl,
    });
  } catch (err) { next(err); }
};

module.exports = { getShareInfo, accessShare };
