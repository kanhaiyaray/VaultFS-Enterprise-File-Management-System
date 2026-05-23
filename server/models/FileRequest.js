/**
 * models/FileRequest.js
 * Public file request links — lets anyone upload files to a user's vault.
 */
const mongoose = require("mongoose");

const fileRequestSchema = new mongoose.Schema(
  {
    owner:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title:       { type: String, required: true },
    description: String,
    slug:        { type: String, required: true, unique: true },  // URL-friendly ID

    // ── Settings ──────────────────────────────────────────────────────────
    isActive:       { type: Boolean, default: true },
    expiresAt:      Date,
    maxFileSize:    { type: Number, default: 50 * 1024 * 1024 },  // 50MB
    maxFiles:       { type: Number, default: 10 },
    maxSubmissions: { type: Number, default: null },
    submissionCount:{ type: Number, default: 0 },
    requireEmail:   { type: Boolean, default: false },
    notifyOnSubmit: { type: Boolean, default: true },

    // ── Allowed types (null = all) ─────────────────────────────────────────
    allowedTypes:  [String],

    // ── Submissions ───────────────────────────────────────────────────────
    submissions: [{
      uploaderEmail: String,
      uploaderName:  String,
      ip:            String,
      files:         [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
      submittedAt:   { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

fileRequestSchema.virtual("maxFileSizeMB").get(function () {
  return this.maxFileSize ? Math.round(this.maxFileSize / (1024 * 1024)) : 0;
});

fileRequestSchema.set("toJSON", { virtuals: true });
fileRequestSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("FileRequest", fileRequestSchema);
