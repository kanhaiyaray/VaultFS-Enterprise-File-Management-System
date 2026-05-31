/**
 * server/models/Workflow.js
 * Workflow automation engine data model.
 */
const mongoose = require("mongoose");

const actionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["notify", "delete", "backup", "report", "approval"],
    required: true,
  },
  label: String,
  params: mongoose.Schema.Types.Mixed,
}, { _id: true });

const triggerSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["time", "file_event", "webhook"],
    required: true,
  },
  scheduleType: {
    type: String,
    enum: ["daily", "weekly", "monthly"],
  },
  scheduleTime: String,
  daysOfWeek: [String],
  dayOfMonth: Number,
  event: {
    type: String,
    enum: ["upload", "delete", "share", "metadata_update", "any"],
    default: "any",
  },
  webhookPath: String,
  webhookSecret: String,
}, { _id: false });

const conditionSchema = new mongoose.Schema({
  field: { type: String, enum: ["mimetype", "tags", "owner", "originalName", "description"], default: "tags" },
  operator: { type: String, enum: ["contains", "equals", "not_equals", "greater_than", "less_than"], default: "contains" },
  value: String,
}, { _id: false });

const pendingApprovalSchema = new mongoose.Schema({
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  requestedAt: Date,
  payload: mongoose.Schema.Types.Mixed,
  note: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedAt: Date,
  decision: String,
}, { _id: false });

const runSchema = new mongoose.Schema({
  status: { type: String, enum: ["pending", "running", "completed", "failed", "rejected"], required: true },
  triggerType: String,
  triggerPayload: mongoose.Schema.Types.Mixed,
  logs: [String],
  result: mongoose.Schema.Types.Mixed,
  startedAt: Date,
  completedAt: Date,
  approvedAt: Date,
  approver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true, _id: true });

const workflowSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isActive: { type: Boolean, default: true },
  trigger: { type: triggerSchema, required: true },
  condition: { type: conditionSchema, default: {} },
  actions: { type: [actionSchema], default: [] },
  approval: {
    required: { type: Boolean, default: false },
    reviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    note: String,
  },
  pendingApproval: pendingApprovalSchema,
  runHistory: { type: [runSchema], default: [] },
  lastRunAt: Date,
  nextRunAt: Date,
}, { timestamps: true });

workflowSchema.index({ isActive: 1, "trigger.type": 1, "trigger.webhookPath": 1 });

module.exports = mongoose.model("Workflow", workflowSchema);
