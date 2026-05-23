/**
 * routes/fileRequests.js
 * Public file request (receive-file-link) endpoints.
 */
const express   = require("express");
const crypto    = require("crypto");
const path      = require("path");
const fs        = require("fs");
const { protect } = require("../middleware/auth");
const { upload, handleMulterError } = require("../middleware/upload");
const FileRequest = require("../models/FileRequest");
const File        = require("../models/File");
const User        = require("../models/User");
const { sendMail, emails } = require("../utils/sendMail");

const router = express.Router();

// List user's requests
router.get("/", protect, async (req, res, next) => {
  try {
    const requests = await FileRequest.find({ owner: req.user.id }).sort("-createdAt");
    return res.json({ success: true, fileRequests: requests });
  } catch (err) { next(err); }
});

// Create request
router.post("/", protect, async (req, res, next) => {
  try {
    const {
      title,
      description,
      maxFiles,
      maxFileSizeBytes,
      maxFileSizeMB,
      maxSubmissions,
      requireEmail,
      expiresAt,
      notifyOnSubmit,
      allowedTypes,
    } = req.body;

    if (!title) return res.status(400).json({ success: false, message: "Title is required." });
    const slug = crypto.randomBytes(8).toString("hex");
    const resolvedMaxFileSize =
      maxFileSizeBytes ? parseInt(maxFileSizeBytes, 10)
        : maxFileSizeMB ? parseInt(maxFileSizeMB, 10) * 1024 * 1024
        : 50 * 1024 * 1024;

    const fr = await FileRequest.create({
      owner: req.user.id,
      title: title.trim(),
      description: description?.trim() || "",
      slug,
      maxFiles: maxFiles ? parseInt(maxFiles, 10) : 10,
      maxFileSize: resolvedMaxFileSize,
      maxSubmissions: maxSubmissions ? parseInt(maxSubmissions, 10) : null,
      requireEmail: !!requireEmail,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      notifyOnSubmit: notifyOnSubmit !== false,
      allowedTypes: Array.isArray(allowedTypes) ? allowedTypes.filter(Boolean) : [],
      isActive: true,
    });
    return res.status(201).json({ success: true, fileRequest: fr });
  } catch (err) { next(err); }
});

// Update request
router.put("/:id", protect, async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.maxFileSizeMB && !updates.maxFileSizeBytes) {
      updates.maxFileSize = parseInt(updates.maxFileSizeMB, 10) * 1024 * 1024;
      delete updates.maxFileSizeMB;
    } else if (updates.maxFileSizeBytes) {
      updates.maxFileSize = parseInt(updates.maxFileSizeBytes, 10);
      delete updates.maxFileSizeBytes;
    }

    const fr = await FileRequest.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $set: updates },
      { new: true }
    );
    if (!fr) return res.status(404).json({ success: false, message: "Request not found." });
    return res.json({ success: true, fileRequest: fr });
  } catch (err) { next(err); }
});

// Delete request
router.delete("/:id", protect, async (req, res, next) => {
  try {
    await FileRequest.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    return res.json({ success: true, message: "File request deleted." });
  } catch (err) { next(err); }
});

// List submissions for a request owned by the current user
router.get("/:id/submissions", protect, async (req, res, next) => {
  try {
    const fr = await FileRequest.findOne({ _id: req.params.id, owner: req.user.id })
      .populate("submissions.files", "originalName size createdAt");

    if (!fr) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    const submissions = (fr.submissions || []).flatMap((submission) =>
      (submission.files || []).map((file) => ({
        _id: file._id,
        originalName: file.originalName,
        size: file.size,
        createdAt: file.createdAt || submission.submittedAt,
        uploaderEmail: submission.uploaderEmail,
        uploaderName: submission.uploaderName,
        submittedAt: submission.submittedAt,
      }))
    );

    return res.json({ success: true, submissions });
  } catch (err) { next(err); }
});

// Public: get request info by slug
router.get("/:slug", async (req, res, next) => {
  try {
    const fr = await FileRequest.findOne({ slug: req.params.slug }).populate("owner", "displayName username");
    if (!fr) return res.status(404).json({ success: false, message: "File request not found." });
    if (!fr.isActive) return res.status(410).json({ success: false, message: "This file request is no longer active." });
    if (fr.expiresAt && new Date(fr.expiresAt) < new Date())
      return res.status(410).json({ success: false, message: "This file request has expired." });
    return res.json({
      success: true,
      fileRequest: {
        title: fr.title, description: fr.description, slug: fr.slug,
        maxFiles: fr.maxFiles, maxFileSizeBytes: fr.maxFileSize,
        maxSubmissions: fr.maxSubmissions, submissionCount: fr.submissionCount,
        requireEmail: fr.requireEmail, expiresAt: fr.expiresAt,
        allowedTypes: fr.allowedTypes || [],
        ownerName: fr.owner?.displayName || fr.owner?.username,
      },
    });
  } catch (err) { next(err); }
});

// Public: submit files
router.post("/:slug/submit", upload.array("files", 20), handleMulterError, async (req, res, next) => {
  try {
    const fr = await FileRequest.findOne({ slug: req.params.slug }).populate("owner");
    if (!fr || !fr.isActive)
      return res.status(404).json({ success: false, message: "File request not found or inactive." });
    if (fr.expiresAt && new Date(fr.expiresAt) < new Date())
      return res.status(410).json({ success: false, message: "This file request has expired." });
    if (fr.maxSubmissions && fr.submissionCount >= fr.maxSubmissions)
      return res.status(409).json({ success: false, message: "This file request is no longer accepting submissions." });
    if (!req.files?.length)
      return res.status(400).json({ success: false, message: "No files provided." });
    if (req.files.length > fr.maxFiles)
      return res.status(400).json({ success: false, message: `You can upload up to ${fr.maxFiles} file(s) at a time.` });

    const { uploaderName = "Anonymous", uploaderEmail = "" } = req.body;
    if (fr.requireEmail && !uploaderEmail)
      return res.status(400).json({ success: false, message: "Email is required for this request." });

    for (const f of req.files) {
      if (f.size > fr.maxFileSize) {
        return res.status(400).json({ success: false, message: `File "${f.originalname}" exceeds the request size limit.` });
      }
      if (fr.allowedTypes?.length && !fr.allowedTypes.includes(f.mimetype)) {
        return res.status(400).json({ success: false, message: `File type not allowed for "${f.originalname}".` });
      }
    }

    const savedFiles = [];
    for (const f of req.files) {
      const fileDoc = await File.create({
        filename: f.filename, originalName: f.originalname,
        mimetype: f.mimetype, size: f.size,
        path: f.path.replace(/\\/g, "/"),
        url: `/uploads/${fr.owner._id}/${f.filename}`,
        owner: fr.owner._id,
        tags: ["file-request", fr.slug],
        description: `Submitted via: ${fr.title} by ${uploaderName}`,
        scanStatus: "pending",
      });
      await User.findByIdAndUpdate(fr.owner._id, { $inc: { storageUsed: f.size } });
      savedFiles.push(fileDoc);
    }
    fr.submissions.push({ uploaderEmail, uploaderName, ip: req.ip, files: savedFiles.map((f) => f._id), submittedAt: new Date() });
    fr.submissionCount = (fr.submissionCount || 0) + 1;
    await fr.save();

    // ✅ FIXED: notification check now uses the correct nested preference field
    if (fr.notifyOnSubmit && fr.owner?.notificationPrefs?.emailOnFileRequest !== false) {
      try {
        const mail = emails.fileRequestSubmitted(fr.owner.displayName || fr.owner.username, uploaderName, fr.title, savedFiles.length);
        await sendMail({ to: fr.owner.email, ...mail });
      } catch {}
    }

    return res.json({ success: true, uploaded: savedFiles.length, message: `${savedFiles.length} file(s) submitted successfully.` });
  } catch (err) { next(err); }
});

module.exports = router;