/**
 * routes/files.js
 * All VaultFS file endpoints.
 * Mount: app.use("/api/files", require("./routes/files"));
 */
const express = require("express");
const { protect, optionalAuth } = require("../middleware/auth");
const { uploadRateLimiter, downloadRateLimiter, bandwidthTracker } = require("../middleware/rateLimiter");
const { upload, handleMulterError } = require("../middleware/upload");

const {
  uploadFiles, getFiles, getStats, getFile, unlockFile, getSignedUrl,
  downloadFile, updateFile, deleteFile, bulkDelete, bulkDownload,
  uploadNewVersion, restoreVersion, getAccessLogs, getPublicGallery,
  starFile, unstarFile, getStarredFiles, batchRename, bulkTags,
  extractArchive, fullTextSearch,
  getTrashFiles, restoreFile, permanentDelete, emptyTrash, uploadFromUrl,
  createShareLink, uploadEncryptedFiles,  //  ADD uploadEncryptedFiles here
} = require("../controllers/fileController");

const { getShareInfo, accessShare } = require("../controllers/shareController");

const router = express.Router();

// ── Public gallery ─────────────────────────────────────────────────────────────
router.get("/public/gallery", getPublicGallery);

// ── Stats (before /:id) ────────────────────────────────────────────────────────
router.get("/stats", protect, getStats);

// ── Starred ────────────────────────────────────────────────────────────────────
router.get("/starred", protect, getStarredFiles);

// ── Trash ─────────────────────────────────────────────────────────────────────
router.get("/trash",       protect, getTrashFiles);
router.delete("/empty-trash", protect, emptyTrash);

// ── Full-text search ───────────────────────────────────────────────────────────
router.get("/search", protect, fullTextSearch);

// ── Bulk operations ────────────────────────────────────────────────────────────
router.post("/bulk-delete",   protect, bulkDelete);
router.post("/bulk-download", protect, bulkDownload);
router.post("/batch-rename",  protect, batchRename);
router.post("/bulk-tags",     protect, bulkTags);

// ── Upload ─────────────────────────────────────────────────────────────────────
router.post(
  "/upload",
  protect,
  uploadRateLimiter,
  bandwidthTracker,
  upload.array("files", 10),
  handleMulterError,
  uploadFiles
);

// ── Upload Encrypted Files (E2EE) ──────────────────────────────────────────────
router.post(
  "/upload-encrypted",
  protect,
  uploadRateLimiter,
  bandwidthTracker,
  upload.array("files", 10),
  handleMulterError,
  uploadEncryptedFiles  // ← ADD THIS ROUTE
);

// ── Upload from URL ────────────────────────────────────────────────────────────
router.post("/upload-from-url", protect, uploadRateLimiter, uploadFromUrl);

// ── List files ─────────────────────────────────────────────────────────────────
router.get("/", protect, getFiles);

// ── Signed URL ─────────────────────────────────────────────────────────────────
router.get("/:id/signed-url", protect, getSignedUrl);

// ── Download ───────────────────────────────────────────────────────────────────
router.get("/download/:id", optionalAuth, downloadRateLimiter, downloadFile);

// ── Versioning ─────────────────────────────────────────────────────────────────
router.put("/:id/version", protect, upload.single("file"), handleMulterError, uploadNewVersion);
router.post("/:id/version/:versionIndex/restore", protect, restoreVersion);

// ── Access logs ────────────────────────────────────────────────────────────────
router.get("/:id/access-logs", protect, getAccessLogs);

// ── Star / Unstar ──────────────────────────────────────────────────────────────
router.post("/:id/star",   protect, starFile);
router.delete("/:id/star", protect, unstarFile);

// ── Archive extraction ─────────────────────────────────────────────────────────
router.post("/:id/extract", protect, extractArchive);

// ── Trash: restore & permanent delete ─────────────────────────────────────────
router.post("/:id/restore",    protect, restoreFile);
router.delete("/:id/permanent", protect, permanentDelete);

// ── Advanced share link ────────────────────────────────────────────────────────
router.post("/:id/share", protect, createShareLink);

// ── Public share token access (used by /s/:token page) ───────────────────────
router.get("/share/:token",              getShareInfo);
router.post("/share/:token/access",      accessShare);

// ── CRUD ───────────────────────────────────────────────────────────────────────
router.get("/:id",       optionalAuth, getFile);
router.post("/:id/unlock", optionalAuth, unlockFile);
router.put("/:id",       protect, updateFile);
router.delete("/:id",    protect, deleteFile);

module.exports = router;