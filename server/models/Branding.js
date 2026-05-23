const mongoose = require("mongoose");

const brandingSchema = new mongoose.Schema({
  appName:      { type: String, default: "VaultFS" },
  logoUrl:      { type: String, default: null },
  faviconUrl:   { type: String, default: null },
  primaryColor: { type: String, default: "#7c3aed" },   // violet-600
  accentColor:  { type: String, default: "#06b6d4" },   // cyan-500
  tagline:      { type: String, default: "Secure File Management" },
  supportEmail: { type: String, default: null },
  footerText:   { type: String, default: null },
  // Feature toggles
  features: {
    urlImport:     { type: Boolean, default: true },
    publicGallery: { type: Boolean, default: true },
    twoFactor:     { type: Boolean, default: true },
    teamCollaboration: { type: Boolean, default: true },
    fileRequests:  { type: Boolean, default: true },
    officePreview: { type: Boolean, default: true },
    registration:  { type: Boolean, default: true },
  },
  // Limits
  limits: {
    maxFileSizeMB:    { type: Number, default: 50 },
    storageLimitGB:   { type: Number, default: 5 },
    uploadRatePerMin: { type: Number, default: 10 },
  },
  allowedMimeTypes: {
    type: [String],
    default: [
      "image/jpeg","image/png","image/gif","image/webp","image/svg+xml",
      "application/pdf","application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain","text/csv","application/zip",
      "video/mp4","video/webm","audio/mpeg","audio/wav",
    ],
  },
  maintenanceMode:    { type: Boolean, default: false },
  maintenanceMessage: { type: String, default: "Scheduled maintenance in progress. Back soon!" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("Branding", brandingSchema);
