const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      trim: true,
      default: "System Announcement",
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    targetRole: {
      type: String,
      enum: ["user", "admin", null],
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

announcementSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.models.Announcement || mongoose.model("Announcement", announcementSchema);
