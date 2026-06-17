const mongoose = require("mongoose");

// ── List of MIME types that are NEVER allowed ─────────────────────────────────
const UNSAFE_MIME_TYPES = [
  "text/html",
  "application/javascript",
  "text/javascript",
  "application/x-javascript",
  "text/x-javascript",
  "application/ecmascript",
  "text/ecmascript",
  "application/xhtml+xml",
  "image/svg+xml",  // dangerous unless sanitized – disallowed by default
];

// ── Safe default allowed types (no executable content) ──────────────────────
const SAFE_DEFAULT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "application/json",      // added – safe
  "application/x-tar",     // added – safe
  "application/gzip",      // added – safe
  "audio/ogg",             // added – safe
  "audio/flac",            // added – safe
];

const brandingSchema = new mongoose.Schema({
  appName:      { type: String, default: "VaultFS" },
  logoUrl:      { type: String, default: null },
  faviconUrl:   { type: String, default: null },
  primaryColor: { type: String, default: "#7c3aed" },
  accentColor:  { type: String, default: "#06b6d4" },
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
    default: SAFE_DEFAULT_TYPES,
    validate: {
      validator: function(types) {
        // Reject if any type is in the UNSAFE list
        return !types.some(t => UNSAFE_MIME_TYPES.includes(t));
      },
      message: props =>
        `Unsafe MIME type(s) detected: ${props.value.filter(t => UNSAFE_MIME_TYPES.includes(t)).join(", ")}. ` +
        `For security, these types are not allowed.`,
    },
  },
  maintenanceMode:    { type: Boolean, default: false },
  maintenanceMessage: { type: String, default: "Scheduled maintenance in progress. Back soon!" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

// ── Pre‑save hook: ensure safe defaults if field is empty ──────────────────
brandingSchema.pre("save", function(next) {
  if (!this.allowedMimeTypes || this.allowedMimeTypes.length === 0) {
    this.allowedMimeTypes = SAFE_DEFAULT_TYPES;
  }
  next();
});

module.exports = mongoose.model("Branding", brandingSchema);