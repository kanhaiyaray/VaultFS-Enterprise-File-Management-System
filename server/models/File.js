/**
 * models/File.js
 * VaultFS File schema — core file metadata, versioning, sharing, labels.
 */
const mongoose = require("mongoose");

const versionSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  size: Number,
  path: String,
  url: String,
  hash: String,
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  note: String,
}, { _id: true });

const fileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    url: { type: String },

    // ── Ownership & organization ────────────────────────────────────────────
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tags: [String],
    description: String,

    // ── Thumbnail (images) ──────────────────────────────────────────────────
    thumbnailPath: String,
    thumbnailUrl: String,

    // ── Image metadata ───────────────────────────────────────────────────────
    metadata: {
      width: Number,
      height: Number,
      exifStripped: Boolean,
      compressed: Boolean,
      originalSize: Number,
    },
    aiDescription: String,
    // ── Deduplication ────────────────────────────────────────────────────────
    hash: { type: String, index: true },
    isDedup: { type: Boolean, default: false },

    // ── Versioning ───────────────────────────────────────────────────────────
    previousVersions: [versionSchema],

    // ── Sharing ──────────────────────────────────────────────────────────────
    isPublic: { type: Boolean, default: false },
    shareToken: { type: String, index: true },
    shareExpiry: Date,
    sharePassword: { type: String, select: false },
    shareMaxDownloads: Number,
    shareDownloadCount: { type: Number, default: 0 },
    shareViewOnly: { type: Boolean, default: false },

    // ── Trash / soft delete ──────────────────────────────────────────────────
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,

    // ── Starred ──────────────────────────────────────────────────────────────
    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ── Labels ───────────────────────────────────────────────────────────────
    // ✅ FIXED: labels are objects with name and color
    labels: [{ name: String, color: String }],

    // ── Virus scan ───────────────────────────────────────────────────────────
    scanStatus: { type: String, enum: ["pending", "clean", "infected", "error"], default: "pending" },

    // ── Access log (last N entries, lightweight) ─────────────────────────────
    accessLogs: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      action: String,
      ip: String,
      userAgent: String,
      at: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

// ── Text index for full-text search ──────────────────────────────────────────
fileSchema.index({ originalName: "text", description: "text", tags: "text", aiDescription: "text" });

// ── Compound index for common queries ─────────────────────────────────────────
fileSchema.index({ owner: 1, isDeleted: 1, createdAt: -1 });
fileSchema.index({ owner: 1, "starredBy": 1 });

module.exports = mongoose.model("File", fileSchema);