/**
 * models/User.js
 * VaultFS User schema.
 */
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username:     { type: String, required: true, unique: true, trim: true, minlength: 3 },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:     { type: String, select: false },           // hashed; null for OAuth users
    displayName:  { type: String, trim: true },
    avatarUrl:    { type: String },

    // ── Auth ───────────────────────────────────────────────────────────────
    role:               { type: String, enum: ["user", "admin"], default: "user" },
    emailVerified:      { type: Boolean, default: false },
    emailVerifyToken:   { type: String, select: false },       // ✅ unified token name
    emailVerifyExpires: { type: Date, select: false },         // ✅ optional expiry

    // ── OAuth ──────────────────────────────────────────────────────────────
    googleId:   { type: String, sparse: true },
    githubId:   { type: String, sparse: true },

    // ── 2FA ────────────────────────────────────────────────────────────────
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret:  { type: String, select: false },

    // ── Storage ────────────────────────────────────────────────────────────
    storageUsed:  { type: Number, default: 0 },
    storageLimit: { type: Number, default: 5 * 1024 * 1024 * 1024 }, // 5 GB
    uploadCount:  { type: Number, default: 0 },

    // ── Account status ─────────────────────────────────────────────────────
    isBanned:       { type: Boolean, default: false },
    banReason:      { type: String },
    banUntil:       { type: Date },
    lastLoginAt:    { type: Date },
    lastLoginIp:    { type: String },

    // ── Preferences ────────────────────────────────────────────────────────
    notificationPrefs: {
      emailOnDownload:    { type: Boolean, default: false },
      emailOnShare:       { type: Boolean, default: true  },
      emailOnFileRequest: { type: Boolean, default: true  },
      emailOnLogin:       { type: Boolean, default: false },
      emailWeeklySummary: { type: Boolean, default: false },
      inAppActivity:      { type: Boolean, default: true  },
      inAppAnnouncements: { type: Boolean, default: true  },
    },

    // ── Labels (color tags) ────────────────────────────────────────────────
    customLabels: [{ name: String, color: String }],
  },
  { timestamps: true }
);

// ── Virtual: storagePercent ───────────────────────────────────────────────────
userSchema.virtual("storagePercent").get(function () {
  return Math.min(((this.storageUsed / this.storageLimit) * 100).toFixed(1), 100);
});
userSchema.set("toJSON", { virtuals: true });

// ── Pre-save: hash password ───────────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Instance method: compare password ─────────────────────────────────────────
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model("User", userSchema);