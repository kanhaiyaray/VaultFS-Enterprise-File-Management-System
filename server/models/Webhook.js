const mongoose = require("mongoose");

const webhookSchema = new mongoose.Schema({
  owner:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name:     { type: String, required: true, trim: true },
  url:      { type: String, required: true },
  secret:   { type: String, default: null },   // HMAC-SHA256 secret for signature verification
  events: {
    type:    [String],
    enum:    ["file.uploaded", "file.deleted", "file.downloaded", "file.shared", "file.restored", "file.starred"],
    default: ["file.uploaded"],
  },
  isActive:       { type: Boolean, default: true },
  lastFiredAt:    { type: Date,   default: null },
  lastStatusCode: { type: Number, default: null },
  totalFired:     { type: Number, default: 0    },
  failureCount:   { type: Number, default: 0    },
}, { timestamps: true });

module.exports = mongoose.model("Webhook", webhookSchema);
