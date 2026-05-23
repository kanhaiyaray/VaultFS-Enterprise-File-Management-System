const mongoose = require("mongoose");

const passwordResetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  token:  { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 60 * 60 * 1000) }, // 1 hour
  used:   { type: Boolean, default: false },
}, { timestamps: true });

passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PasswordReset", passwordResetSchema);
