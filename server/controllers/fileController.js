/**
 * controllers/fileController.js
 * VaultFS — complete file management controller.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const sharp = require("sharp");
const archiver = require("archiver");
const unzipper = require("unzipper");

const File = require("../models/File");
const User = require("../models/User");
const { sendMail, emails } = require("../utils/sendMail");
const { logActivity } = require("../utils/activityLogger");

// ✅ Added for download notifications and webhooks
const { sendDownloadNotification } = require("./notificationController");
const { triggerWebhook } = require("./webhookController");

// ── Helpers ───────────────────────────────────────────────────────────────────
const hashBuffer = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const hashFile = (filePath) => {
  const buf = fs.readFileSync(filePath);
  return hashBuffer(buf);
};

const generateFallbackAIDescription = ({ originalName, description, tags, mimetype }) => {
  const label = mimetype?.startsWith("image/") ? "image" : "file";
  const nameText = originalName ? originalName.replace(/[_-]+/g, " ").replace(/\.[^.]+$/, "") : "untitled";
  const tagText = Array.isArray(tags) && tags.length ? ` Tags: ${tags.join(", ")}.` : "";
  const descriptionText = description ? ` Described as: ${description}.` : "";
  return `A ${label} named ${nameText}.${descriptionText}${tagText}`;
};

const isProcessableImage = (mime) =>
  ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mime);

const emitActivity = (userId, type, payload, io) => {
  try {
    if (io) io.to(`user:${userId}`).emit("activity", { type, payload, timestamp: new Date() });
  } catch { }
};

const logAccess = async (fileId, userId, action, req) => {
  try {
    await File.findByIdAndUpdate(fileId, {
      $push: {
        accessLogs: {
          $each: [{ user: userId, action, ip: req.ip, at: new Date() }],
          $slice: -50,
        },
      },
    });
  } catch { }
};

// ── Image processing (thumbnail + compression) ────────────────────────────────
async function processImage(filePath, destDir) {
  const originalSize = fs.statSync(filePath).size;
  const meta = await sharp(filePath).metadata();
  const { width, height } = meta;

  // Re-compress in place (JPEG/PNG)
  const ext = path.extname(filePath).toLowerCase();
  const tmp = filePath + ".tmp";
  let compressed = false;
  if ([".jpg", ".jpeg"].includes(ext)) {
    await sharp(filePath).jpeg({ quality: 82, mozjpeg: true }).toFile(tmp);
    if (fs.statSync(tmp).size < originalSize) {
      fs.renameSync(tmp, filePath);
      compressed = true;
    } else {
      fs.unlinkSync(tmp);
    }
  } else if (ext === ".png") {
    await sharp(filePath).png({ compressionLevel: 8 }).toFile(tmp);
    if (fs.statSync(tmp).size < originalSize) {
      fs.renameSync(tmp, filePath);
      compressed = true;
    } else {
      fs.unlinkSync(tmp);
    }
  }

  // Thumbnail
  const thumbName = `thumb_${path.basename(filePath)}`;
  const thumbPath = path.join(destDir, thumbName);
  await sharp(filePath)
    .resize(320, 320, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toFile(thumbPath);

  return { width, height, compressed, exifStripped: true, originalSize, thumbnailPath: thumbPath };
}

// ─────────────────────────────────────────────────────────────────────────────
//  UPLOAD
// ─────────────────────────────────────────────────────────────────────────────
const uploadFiles = async (req, res, next) => {
  try {
    const io = req.app.locals.io;
    if (!req.files?.length)
      return res.status(400).json({ success: false, message: "No files uploaded." });

    const user = await User.findById(req.user.id);
    const tags = req.body.tags ? req.body.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const description = req.body.description || "";

    const uploaded = [];
    const skipped = [];

    for (const f of req.files) {
      // Storage quota
      if (user.storageUsed + f.size > user.storageLimit) {
        fs.unlinkSync(f.path);
        skipped.push({ originalName: f.originalname, reason: "Storage quota exceeded." });
        continue;
      }

      const fileHash = hashFile(f.path);

      // Dedup check
      const existingOwn = await File.findOne({ hash: fileHash, owner: req.user.id, isDeleted: false });
      if (existingOwn) {
        fs.unlinkSync(f.path);
        skipped.push({ originalName: f.originalname, reason: "Duplicate", existingFile: existingOwn });
        continue;
      }

      // Image processing
      let imgMeta = {};
      let thumbPath = null;
      let thumbUrl = null;
      const userDir = path.dirname(f.path);

      if (isProcessableImage(f.mimetype)) {
        try {
          const result = await processImage(f.path, userDir);
          imgMeta = { width: result.width, height: result.height, compressed: result.compressed, exifStripped: result.exifStripped, originalSize: result.originalSize };
          if (result.thumbnailPath) {
            thumbPath = result.thumbnailPath;
            thumbUrl = `/uploads/${req.user.id}/${path.basename(result.thumbnailPath)}`;
          }
        } catch { }
      }

      const fileDoc = await File.create({
        filename: f.filename,
        originalName: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        path: f.path.replace(/\\/g, "/"),
        url: `/uploads/${req.user.id}/${f.filename}`,
        thumbnailPath: thumbPath,
        thumbnailUrl: thumbUrl,
        owner: req.user.id,
        hash: fileHash,
        tags,
        description,
        aiDescription: generateFallbackAIDescription({ originalName: f.originalname, description, tags, mimetype: f.mimetype }),
        metadata: imgMeta,
        scanStatus: "pending",
        starredBy: [],
      });

      await User.findByIdAndUpdate(req.user.id, {
        $inc: { storageUsed: f.size, uploadCount: 1 },
      });
      user.storageUsed += f.size;

      await logAccess(fileDoc._id, req.user.id, "upload", req);
      logActivity(req, req.user.id, "upload", { filename: f.originalname, size: f.size, mimetype: f.mimetype });
      uploaded.push(fileDoc);
    }

    emitActivity(req.user.id, "upload", { count: uploaded.length, files: uploaded.map((f) => ({ id: f._id, name: f.originalName, size: f.size })) }, io);

    // ✅ Fire webhook for each upload (once per batch)
    if (uploaded.length) {
      triggerWebhook(req.user.id, "file.uploaded", {
        files: uploaded.map((f) => ({ id: f._id, name: f.originalName, size: f.size })),
      }).catch(() => { });
    }

    return res.status(201).json({
      success: true,
      files: uploaded,
      skipped,
      message: `${uploaded.length} file(s) uploaded.`,
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  LIST FILES
// ─────────────────────────────────────────────────────────────────────────────
const getFiles = async (req, res, next) => {
  try {
    // Disable caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const {
      page = 1, limit = 20, sort = "-createdAt",
      search, tag, mimetype, starred,
    } = req.query;

    const query = { owner: req.user.id, isDeleted: false };
    if (search) query.$text = { $search: search };
    if (tag) query.tags = tag;
    if (mimetype) query.mimetype = { $regex: mimetype, $options: "i" };
    if (starred === "true") query.starredBy = req.user.id;

    const total = await File.countDocuments(query);
    const files = await File.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const userId = req.user.id.toString();
    const transformedFiles = files.map((f) => ({
      ...f,
      isStarred: f.starredBy?.some((id) => id.toString() === userId) ?? false,
    }));

    return res.json({
      success: true,
      files: transformedFiles,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  STATS
// ─────────────────────────────────────────────────────────────────────────────
const getStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const query = { owner: req.user.id, isDeleted: false };

    const totalFiles = await File.countDocuments(query);
    const totalDownloads = await File.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: "$shareDownloadCount" } } },
    ]);

    // By MIME type
    const mimeAgg = await File.aggregate([
      { $match: query },
      { $group: { _id: "$mimetype", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    const byMimeType = Object.fromEntries(mimeAgg.map((m) => [m._id, m.count]));

    // Today uploads
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const uploadedToday = await File.countDocuments({ ...query, createdAt: { $gte: todayStart } });

    // Upload trend last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const trendAgg = await File.aggregate([
      { $match: { ...query, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        }
      },
      { $sort: { _id: 1 } },
    ]);
    const uploadTrend = trendAgg.map((t) => ({ date: t._id, count: t.count }));

    return res.json({
      success: true,
      totalFiles,
      totalDownloads: totalDownloads[0]?.total || 0,
      storageUsed: user.storageUsed,
      storageLimit: user.storageLimit,
      storagePercent: user.storagePercent,
      uploadedToday,
      byMimeType,
      uploadTrend,
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET SINGLE FILE
// ─────────────────────────────────────────────────────────────────────────────
const getFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ success: false, message: "File not found." });

    // Public or owner
    if (!file.isPublic && (!req.user || file.owner.toString() !== req.user.id))
      return res.status(403).json({ success: false, message: "Access denied." });

    return res.json({ success: true, file });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  UPDATE FILE
// ─────────────────────────────────────────────────────────────────────────────
const updateFile = async (req, res, next) => {
  try {
    const { originalName, description, tags, isPublic, labels } = req.body;
    const file = await File.findOne({ _id: req.params.id, owner: req.user.id, isDeleted: false });
    if (!file) return res.status(404).json({ success: false, message: "File not found." });

    if (originalName !== undefined) file.originalName = originalName;
    if (description !== undefined) file.description = description;
    if (isPublic !== undefined) file.isPublic = isPublic;
    if (labels !== undefined) file.labels = labels;
    if (tags !== undefined) {
      file.tags = Array.isArray(tags)
        ? tags.map((t) => t.trim()).filter(Boolean)
        : tags.split(",").map((t) => t.trim()).filter(Boolean);
    }
    await file.save();
    return res.json({ success: true, file });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE (soft)
// ─────────────────────────────────────────────────────────────────────────────
const deleteFile = async (req, res, next) => {
  try {
    const io = req.app.locals.io;
    const file = await File.findOne({ _id: req.params.id, owner: req.user.id, isDeleted: false });
    if (!file) return res.status(404).json({ success: false, message: "File not found." });

    file.isDeleted = true;
    file.deletedAt = new Date();
    await file.save();
    logActivity(req, req.user.id, "delete", { filename: file.originalName, size: file.size });

    await User.findByIdAndUpdate(req.user.id, { $inc: { storageUsed: -file.size } });

    emitActivity(req.user.id, "delete", { fileName: file.originalName }, io);

    // ✅ Fire webhook
    triggerWebhook(req.user.id, "file.deleted", {
      fileId: file._id,
      fileName: file.originalName,
    }).catch(() => { });

    return res.json({ success: true, message: "File moved to trash." });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  BULK DELETE (soft)
// ─────────────────────────────────────────────────────────────────────────────
const bulkDelete = async (req, res, next) => {
  try {
    const io = req.app.locals.io;
    const ids = req.body.ids || [];
    if (!ids.length) return res.status(400).json({ success: false, message: "No file ids provided." });

    const files = await File.find({ _id: { $in: ids }, owner: req.user.id, isDeleted: false });
    let totalSize = 0;
    for (const f of files) {
      f.isDeleted = true;
      f.deletedAt = new Date();
      await f.save();
      totalSize += f.size;
    }
    if (totalSize > 0)
      await User.findByIdAndUpdate(req.user.id, { $inc: { storageUsed: -totalSize } });

    emitActivity(req.user.id, "bulk_delete", { count: files.length }, io);
    return res.json({ success: true, deleted: files.length, message: `${files.length} file(s) moved to trash.` });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  BULK DOWNLOAD (zip)
// ─────────────────────────────────────────────────────────────────────────────
const bulkDownload = async (req, res, next) => {
  try {
    const ids = req.body.ids || [];
    if (!ids.length) return res.status(400).json({ success: false, message: "No file ids provided." });

    const files = await File.find({ _id: { $in: ids }, owner: req.user.id, isDeleted: false });
    if (!files.length) return res.status(404).json({ success: false, message: "No files found." });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="vaultfs-download-${Date.now()}.zip"`);

    const archive = archiver("zip", { zlib: { level: 5 } });
    archive.pipe(res);
    for (const f of files) {
      if (f.path && fs.existsSync(f.path))
        archive.file(f.path, { name: f.originalName });
    }
    await archive.finalize();
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DOWNLOAD SINGLE FILE
// ─────────────────────────────────────────────────────────────────────────────
const downloadFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id).select("+sharePassword");
    if (!file || file.isDeleted)
      return res.status(404).json({ success: false, message: "File not found." });

    const isOwner = req.user && file.owner.toString() === req.user.id;
    const rawToken = req.query.accessToken;
    let hasSignedAccess = false;

    if (rawToken) {
      try {
        const decoded = jwt.verify(rawToken, process.env.JWT_SECRET);
        hasSignedAccess = decoded.fileId === file._id.toString();
      } catch {
        hasSignedAccess = false;
      }
    }

    if (!isOwner && !hasSignedAccess) {
      if (!file.isPublic)
        return res.status(403).json({ success: false, message: "Access denied." });

      if (file.sharePassword) {
        if (!rawToken)
          return res.status(401).json({ success: false, message: "Access token required for this protected file." });
        try {
          const decoded = jwt.verify(rawToken, process.env.JWT_SECRET);
          if (decoded.fileId !== file._id.toString())
            throw new Error("Token/file mismatch");
        } catch {
          return res.status(401).json({ success: false, message: "Invalid or expired access token. Re-enter the share password." });
        }
      }

      if (file.shareViewOnly)
        return res.status(403).json({ success: false, message: "Download disabled for this share." });
      if (file.shareExpiry && new Date(file.shareExpiry) < new Date())
        return res.status(410).json({ success: false, message: "Share link has expired." });
      if (file.shareMaxDownloads && file.shareDownloadCount >= file.shareMaxDownloads)
        return res.status(410).json({ success: false, message: "Download limit reached." });

      await File.findByIdAndUpdate(file._id, { $inc: { shareDownloadCount: 1 } });

      const owner = await User.findById(file.owner);
      if (owner?.notificationPrefs?.emailOnDownload) {
        try {
          const info = emails.fileDownloaded(owner.displayName || owner.username, file.originalName, `IP: ${req.ip}`);
          await sendMail({ to: owner.email, ...info });
        } catch { }
      }

      // ✅ Fire download notification and webhook (fire-and-forget)
      sendDownloadNotification(file, req).catch(() => { });
      triggerWebhook(file.owner.toString(), "file.downloaded", {
        fileId: file._id,
        fileName: file.originalName,
        by: req.user?.id || "anonymous",
      }).catch(() => { });
    }

    if (!file.path || !fs.existsSync(file.path))
      return res.status(404).json({ success: false, message: "File data not found on disk." });

    await logAccess(file._id, req.user?.id, "download", req);
    if (req.user) logActivity(req, req.user.id, "download", { filename: file.originalName, size: file.size });

    const dispositionType = req.query.inline === "1" ? "inline" : "attachment";
    res.setHeader("Content-Disposition", `${dispositionType}; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader("Content-Type", file.mimetype || "application/octet-stream");
    res.setHeader("Content-Length", file.size);
    return res.sendFile(path.resolve(file.path));
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
//  SIGNED URL (for secure preview / download links)
// ─────────────────────────────────────────────────────────────────────────────
const getSignedUrl = async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user.id, isDeleted: false });
    if (!file) return res.status(404).json({ success: false, message: "File not found." });

    // Generate a short-lived JWT (5 minutes) containing the fileId
    const accessToken = jwt.sign(
      { fileId: file._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    const url = `/api/files/download/${file._id}?accessToken=${accessToken}&inline=1`;
    return res.json({ success: true, url, filename: file.originalName });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  UNLOCK (password-protected share)
// ─────────────────────────────────────────────────────────────────────────────
const unlockFile = async (req, res, next) => {
  try {
    const { password } = req.body;
    const file = await File.findById(req.params.id).select("+sharePassword");
    if (!file) return res.status(404).json({ success: false, message: "File not found." });
    if (!file.sharePassword)
      return res.json({ success: true, file });

    const match = await require("bcryptjs").compare(password, file.sharePassword);
    if (!match) return res.status(401).json({ success: false, message: "Incorrect password." });

    const safe = file.toJSON();
    delete safe.sharePassword;
    return res.json({ success: true, file: safe });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  VERSIONING
// ─────────────────────────────────────────────────────────────────────────────
const uploadNewVersion = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file provided." });
    const file = await File.findOne({ _id: req.params.id, owner: req.user.id, isDeleted: false });
    if (!file) return res.status(404).json({ success: false, message: "File not found." });

    file.previousVersions.push({
      filename: file.filename,
      originalName: file.originalName,
      size: file.size,
      path: file.path,
      url: file.url,
      hash: file.hash,
      uploadedAt: file.updatedAt || file.createdAt,
      uploadedBy: req.user.id,
      note: req.body.note || "",
    });

    const sizeDiff = req.file.size - file.size;
    file.filename = req.file.filename;
    file.originalName = req.file.originalname;
    file.size = req.file.size;
    file.path = req.file.path.replace(/\\/g, "/");
    file.url = `/uploads/${req.user.id}/${req.file.filename}`;
    file.hash = hashFile(req.file.path);

    await file.save();
    if (sizeDiff !== 0)
      await User.findByIdAndUpdate(req.user.id, { $inc: { storageUsed: sizeDiff } });

    return res.json({ success: true, file, message: "New version uploaded." });
  } catch (err) { next(err); }
};

const restoreVersion = async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user.id, isDeleted: false });
    if (!file) return res.status(404).json({ success: false, message: "File not found." });

    const idx = parseInt(req.params.versionIndex);
    if (isNaN(idx) || idx < 0 || idx >= file.previousVersions.length)
      return res.status(400).json({ success: false, message: "Invalid version index." });

    const oldVersion = file.previousVersions[idx];
    file.previousVersions.push({
      filename: file.filename, originalName: file.originalName,
      size: file.size, path: file.path, url: file.url, hash: file.hash,
      uploadedAt: new Date(), uploadedBy: req.user.id, note: "Restored from version",
    });
    file.previousVersions.splice(idx, 1);

    const sizeDiff = oldVersion.size - file.size;
    file.filename = oldVersion.filename;
    file.originalName = oldVersion.originalName;
    file.size = oldVersion.size;
    file.path = oldVersion.path;
    file.url = oldVersion.url;
    file.hash = oldVersion.hash;
    await file.save();
    if (sizeDiff !== 0)
      await User.findByIdAndUpdate(req.user.id, { $inc: { storageUsed: sizeDiff } });

    // ✅ Fire webhook for restore
    triggerWebhook(req.user.id, "file.restored", {
      fileId: file._id,
      fileName: file.originalName,
    }).catch(() => { });

    return res.json({ success: true, file, message: "Version restored." });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ACCESS LOGS
// ─────────────────────────────────────────────────────────────────────────────
const getAccessLogs = async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user.id });
    if (!file) return res.status(404).json({ success: false, message: "File not found." });
    return res.json({ success: true, accessLogs: file.accessLogs || [] });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC GALLERY
// ─────────────────────────────────────────────────────────────────────────────
const getPublicGallery = async (req, res, next) => {
  try {
    const { page = 1, limit = 24, search } = req.query;
    const query = { isPublic: true, isDeleted: false };
    if (search) query.$text = { $search: search };

    const total = await File.countDocuments(query);
    const files = await File.find(query)
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select("-path -sharePassword -accessLogs")
      .lean();

    return res.json({ success: true, files, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  STAR / UNSTAR
// ─────────────────────────────────────────────────────────────────────────────
const starFile = async (req, res, next) => {
  try {
    const file = await File.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id, isDeleted: false },
      { $addToSet: { starredBy: req.user.id } },
      { new: true }
    );
    if (!file) return res.status(404).json({ success: false, message: "File not found." });

    // ✅ Fire webhook for star
    triggerWebhook(req.user.id, "file.starred", {
      fileId: file._id,
      fileName: file.originalName,
    }).catch(() => { });

    return res.json({ success: true, file });
  } catch (err) { next(err); }
};

const unstarFile = async (req, res, next) => {
  try {
    const file = await File.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $pull: { starredBy: req.user.id } },
      { new: true }
    );
    if (!file) return res.status(404).json({ success: false, message: "File not found." });
    return res.json({ success: true, file });
  } catch (err) { next(err); }
};

const getStarredFiles = async (req, res, next) => {
  try {
    const files = await File.find({ owner: req.user.id, starredBy: req.user.id, isDeleted: false })
      .sort("-updatedAt")
      .lean();
    const transformedFiles = files.map((f) => ({ ...f, isStarred: true }));
    return res.json({ success: true, files: transformedFiles });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  BATCH RENAME
// ─────────────────────────────────────────────────────────────────────────────
const batchRename = async (req, res, next) => {
  try {
    const renames = req.body.renames || [];
    const results = [];
    for (const { id, name } of renames) {
      const f = await File.findOneAndUpdate(
        { _id: id, owner: req.user.id, isDeleted: false },
        { originalName: name },
        { new: true }
      );
      if (f) results.push(f);
    }
    return res.json({ success: true, renamed: results.length, files: results });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  BULK TAGS
// ─────────────────────────────────────────────────────────────────────────────
const bulkTags = async (req, res, next) => {
  try {
    const { ids, addTags, removeTags } = req.body;
    if (!ids?.length) return res.status(400).json({ success: false, message: "No file ids provided." });

    const update = {};
    if (addTags?.length) update.$addToSet = { tags: { $each: addTags } };
    if (removeTags?.length) update.$pullAll = { tags: removeTags };

    const result = await File.updateMany(
      { _id: { $in: ids }, owner: req.user.id, isDeleted: false },
      update
    );
    return res.json({ success: true, updated: result.modifiedCount });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  EXTRACT ARCHIVE
// ─────────────────────────────────────────────────────────────────────────────
const extractArchive = async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user.id, isDeleted: false });
    if (!file) return res.status(404).json({ success: false, message: "File not found." });
    if (!file.mimetype.includes("zip"))
      return res.status(400).json({ success: false, message: "Only ZIP archives can be extracted." });

    const destDir = path.join(path.dirname(file.path), `extracted_${Date.now()}`);
    fs.mkdirSync(destDir, { recursive: true });

    const extracted = [];
    await fs.createReadStream(file.path)
      .pipe(unzipper.Parse())
      .on("entry", (entry) => {
        const safeName = path.basename(entry.path);
        const destPath = path.join(destDir, safeName);
        entry.pipe(fs.createWriteStream(destPath)).on("finish", () => {
          extracted.push({ name: safeName, path: destPath });
        });
      })
      .promise();

    const createdFiles = [];
    for (const e of extracted) {
      const stat = fs.statSync(e.path);
      const doc = await File.create({
        filename: path.basename(e.path),
        originalName: e.name,
        mimetype: "application/octet-stream",
        size: stat.size,
        path: e.path,
        url: `/uploads/${req.user.id}/${path.basename(e.path)}`,
        owner: req.user.id,
        hash: hashFile(e.path),
        tags: ["extracted"],
        scanStatus: "pending",
      });
      await User.findByIdAndUpdate(req.user.id, { $inc: { storageUsed: stat.size } });
      createdFiles.push(doc);
    }

    return res.json({ success: true, extracted: createdFiles.length, files: createdFiles });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  FULL TEXT SEARCH (supports all AdvancedSearch filters)
// ─────────────────────────────────────────────────────────────────────────────
const fullTextSearch = async (req, res, next) => {
  try {
    const {
      q = "",
      operator = "AND",           // "AND" or "OR"
      mimetype = "",
      tags = "",
      dateFrom = "",
      dateTo = "",
      starred = false,
      sortBy = "createdAt",
      order = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { isDeleted: false };
    const ownerFilter = req.user.role === "admin" ? {} : { owner: req.user.id };
    Object.assign(filter, ownerFilter);

    // ── Full‑text query (with optional NOT terms using minus prefix) ─────────
    if (q && q.trim()) {
      const terms = q.trim().split(/\s+/);
      const mustTerms = terms.filter(t => !t.startsWith("-"));
      const notTerms = terms.filter(t => t.startsWith("-")).map(t => t.slice(1));

      if (operator === "OR") {
        if (mustTerms.length) {
          filter.$or = mustTerms.map(term => ({
            $or: [
              { originalName: { $regex: term, $options: "i" } },
              { description: { $regex: term, $options: "i" } },
              { aiDescription: { $regex: term, $options: "i" } },
              { tags: { $regex: term, $options: "i" } },
            ],
          }));
        }
      } else { // AND
        mustTerms.forEach(term => {
          filter.$and = filter.$and || [];
          filter.$and.push({
            $or: [
              { originalName: { $regex: term, $options: "i" } },
              { description: { $regex: term, $options: "i" } },
              { aiDescription: { $regex: term, $options: "i" } },
              { tags: { $regex: term, $options: "i" } },
            ],
          });
        });
      }

      // NOT terms: ensure none of the fields contain the term
      for (const term of notTerms) {
        filter.$and = filter.$and || [];
        filter.$and.push({
          $nor: [
            { originalName: { $regex: term, $options: "i" } },
            { description: { $regex: term, $options: "i" } },
            { aiDescription: { $regex: term, $options: "i" } },
            { tags: { $regex: term, $options: "i" } },
          ],
        });
      }
    }

    // ── MIME type filter (prefix or exact) ──────────────────────────────────
    if (mimetype) {
      filter.mimetype = { $regex: `^${mimetype}`, $options: "i" };
    }

    // ── Tags filter (comma‑separated, all must match) ───────────────────────
    if (tags) {
      const tagList = tags.split(",").map(t => t.trim());
      filter.tags = { $all: tagList };
    }

    // ── Date range (createdAt) ──────────────────────────────────────────────
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // ── Starred only ────────────────────────────────────────────────────────
    if (starred === "true" || starred === true) {
      filter.starredBy = req.user.id;
    }

    // ── Sorting ─────────────────────────────────────────────────────────────
    const sort = {};
    sort[sortBy] = order === "asc" ? 1 : -1;

    // ── Pagination ──────────────────────────────────────────────────────────
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const total = await File.countDocuments(filter);
    const files = await File.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Add `isStarred` flag (frontend expects it)
    const userId = req.user.id.toString();
    const transformedFiles = files.map(f => ({
      ...f,
      isStarred: f.starredBy?.some(id => id.toString() === userId) ?? false,
    }));

    return res.json({
      success: true,
      files: transformedFiles,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  TRASH OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────
const getTrashFiles = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const query = { owner: req.user.id, isDeleted: true };
    const total = await File.countDocuments(query);
    const files = await File.find(query)
      .sort({ deletedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    return res.json({ success: true, files, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

const restoreFile = async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user.id, isDeleted: true });
    if (!file) return res.status(404).json({ success: false, message: "File not found in trash." });
    if (!file.isDedup && !fs.existsSync(file.path))
      return res.status(400).json({ success: false, message: "File data no longer exists on disk." });

    file.isDeleted = false;
    file.deletedAt = null;
    await file.save();
    await User.findByIdAndUpdate(req.user.id, { $inc: { storageUsed: file.size } });

    // ✅ Fire webhook for restore
    triggerWebhook(req.user.id, "file.restored", {
      fileId: file._id,
      fileName: file.originalName,
    }).catch(() => { });

    return res.json({ success: true, file, message: "File restored." });
  } catch (err) { next(err); }
};

const permanentDelete = async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user.id });
    if (!file) return res.status(404).json({ success: false, message: "File not found." });

    if (!file.isDedup && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    if (file.thumbnailPath && fs.existsSync(file.thumbnailPath)) fs.unlinkSync(file.thumbnailPath);
    await File.findByIdAndDelete(file._id);

    return res.json({ success: true, message: "File permanently deleted." });
  } catch (err) { next(err); }
};

const emptyTrash = async (req, res, next) => {
  try {
    const files = await File.find({ owner: req.user.id, isDeleted: true });
    let removed = 0;
    for (const file of files) {
      try {
        if (!file.isDedup && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        if (file.thumbnailPath && fs.existsSync(file.thumbnailPath)) fs.unlinkSync(file.thumbnailPath);
        await File.findByIdAndDelete(file._id);
        removed++;
      } catch { }
    }
    return res.json({ success: true, deleted: removed, message: `${removed} file(s) permanently deleted.` });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  UPLOAD FROM URL
// ─────────────────────────────────────────────────────────────────────────────
const uploadFromUrl = async (req, res, next) => {
  try {
    const io = req.app.locals.io;
    const { url, filename, tags, description } = req.body;
    if (!url) return res.status(400).json({ success: false, message: "URL is required." });

    let parsedUrl;
    try { parsedUrl = new URL(url); } catch {
      return res.status(400).json({ success: false, message: "Invalid URL format." });
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol))
      return res.status(400).json({ success: false, message: "Only HTTP/HTTPS URLs are supported." });

    const MAX_SIZE_BYTES = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024;

    let response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);
      response = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "VaultFS/3.1 File Importer" } });
      clearTimeout(timeoutId);
    } catch (fetchErr) {
      return res.status(400).json({ success: false, message: `Failed to fetch URL: ${fetchErr.message}` });
    }

    if (!response.ok)
      return res.status(400).json({ success: false, message: `Remote server returned ${response.status} ${response.statusText}.` });

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";
    const rawName = filename?.trim() || decodeURIComponent(parsedUrl.pathname.split("/").pop()) || "imported-file";
    const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "imported-file";

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_SIZE_BYTES)
      return res.status(400).json({ success: false, message: `File too large. Max ${MAX_SIZE_BYTES / 1024 / 1024}MB.` });

    const userDoc = await User.findById(req.user.id);
    if (userDoc.storageUsed + buffer.length > userDoc.storageLimit)
      return res.status(400).json({ success: false, message: "Storage quota exceeded." });

    const fileHash = hashBuffer(buffer);
    const userDup = await File.findOne({ hash: fileHash, owner: req.user.id, isDeleted: false });
    if (userDup)
      return res.status(409).json({ success: false, message: "This file already exists in your vault.", existingFile: userDup });

    const userDir = path.join(__dirname, "../uploads", req.user.id.toString());
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

    const ext = path.extname(safeName) || "";
    const generatedFilename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    const destPath = path.join(userDir, generatedFilename);
    fs.writeFileSync(destPath, buffer);

    let imgMeta = {};
    let thumbPath = null;
    let thumbUrl = null;
    if (isProcessableImage(contentType)) {
      try {
        const result = await processImage(destPath, userDir);
        imgMeta = { width: result.width, height: result.height, compressed: result.compressed, exifStripped: result.exifStripped, originalSize: result.originalSize };
        if (result.thumbnailPath) {
          thumbPath = result.thumbnailPath;
          thumbUrl = `/uploads/${req.user.id}/${path.basename(result.thumbnailPath)}`;
        }
      } catch { }
    }

    const fileDoc = await File.create({
      filename: generatedFilename,
      originalName: safeName,
      mimetype: contentType,
      size: buffer.length,
      path: destPath.replace(/\\/g, "/"),
      url: `/uploads/${req.user.id}/${generatedFilename}`,
      thumbnailPath: thumbPath,
      thumbnailUrl: thumbUrl,
      owner: req.user.id,
      hash: fileHash,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : ["url-import"],
      description: description || `Imported from: ${url}`,
      aiDescription: generateFallbackAIDescription({
        originalName: safeName,
        description: description || `Imported from: ${url}`,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : ["url-import"],
        mimetype: contentType,
      }),
      metadata: imgMeta,
      scanStatus: "pending",
    });

    await User.findByIdAndUpdate(req.user.id, { $inc: { storageUsed: buffer.length, uploadCount: 1 } });
    await logAccess(fileDoc._id, req.user.id, "upload", req);
    emitActivity(req.user.id, "upload", { count: 1, files: [{ id: fileDoc._id, name: fileDoc.originalName, size: fileDoc.size }] }, io);

    // ✅ Fire webhook for URL import upload
    triggerWebhook(req.user.id, "file.uploaded", {
      files: [{ id: fileDoc._id, name: fileDoc.originalName, size: fileDoc.size }],
    }).catch(() => { });

    return res.status(201).json({ success: true, file: fileDoc, message: `"${safeName}" imported successfully.` });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADVANCED SHARE
// ─────────────────────────────────────────────────────────────────────────────
const createShareLink = async (req, res, next) => {
  try {
    const { expiresIn, maxDownloads, password, viewOnly } = req.body;
    const file = await File.findOne({ _id: req.params.id, owner: req.user.id, isDeleted: false });
    if (!file) return res.status(404).json({ success: false, message: "File not found." });

    const token = crypto.randomBytes(24).toString("hex");
    file.shareToken = token;
    file.isPublic = true;
    file.shareViewOnly = !!viewOnly;
    file.shareDownloadCount = 0;

    if (maxDownloads) file.shareMaxDownloads = parseInt(maxDownloads);
    if (expiresIn) file.shareExpiry = new Date(Date.now() + parseInt(expiresIn) * 1000);
    if (password) {
      const bcrypt = require("bcryptjs");
      file.sharePassword = await bcrypt.hash(password, 10);
    }
    await file.save();

    return res.json({ success: true, token, url: `${process.env.CLIENT_URL}/s/${token}` });
  } catch (err) { next(err); }
};

module.exports = {
  uploadFiles, getFiles, getStats, getFile, unlockFile, getSignedUrl,
  downloadFile, updateFile, deleteFile, bulkDelete, bulkDownload,
  uploadNewVersion, restoreVersion, getAccessLogs, getPublicGallery,
  starFile, unstarFile, getStarredFiles, batchRename, bulkTags, extractArchive, fullTextSearch,
  getTrashFiles, restoreFile, permanentDelete, emptyTrash, uploadFromUrl,
  createShareLink,
};
