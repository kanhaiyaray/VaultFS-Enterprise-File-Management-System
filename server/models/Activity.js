const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: "unknown",
      trim: true,
    },
    userAgent: {
      type: String,
      default: "unknown",
      trim: true,
    },
  },
  { timestamps: true }
);

activitySchema.index({ createdAt: -1 });
activitySchema.index({ action: 1, createdAt: -1 });
activitySchema.index({ "details.filename": 1 });
activitySchema.index({ "details.originalName": 1 });

module.exports = mongoose.models.Activity || mongoose.model("Activity", activitySchema);
