/**
 * server/controllers/workflowController.js
 * Admin API endpoints for workflows and webhook triggers.
 */
const Workflow = require("../models/Workflow");
const { executeWorkflow, triggerWebhook } = require("../utils/workflowEngine");

const getWorkflows = async (req, res, next) => {
  try {
    const workflows = await Workflow.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, workflows });
  } catch (err) { next(err); }
};

const getWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findById(req.params.id).lean();
    if (!workflow) return res.status(404).json({ success: false, message: "Workflow not found." });
    return res.json({ success: true, workflow });
  } catch (err) { next(err); }
};

const createWorkflow = async (req, res, next) => {
  try {
    const payload = { ...req.body, createdBy: req.user.id };
    const workflow = await Workflow.create(payload);
    return res.status(201).json({ success: true, workflow });
  } catch (err) { next(err); }
};

const updateWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ success: false, message: "Workflow not found." });

    const allowed = ["name", "description", "isActive", "trigger", "condition", "actions", "approval"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) workflow[key] = req.body[key];
    }
    if (workflow.approval?.required && workflow.pendingApproval?.status === "pending") {
      workflow.pendingApproval = null;
    }

    await workflow.save();
    return res.json({ success: true, workflow });
  } catch (err) { next(err); }
};

const deleteWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findByIdAndDelete(req.params.id);
    if (!workflow) return res.status(404).json({ success: false, message: "Workflow not found." });
    return res.json({ success: true, message: "Workflow deleted." });
  } catch (err) { next(err); }
};

const runWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ success: false, message: "Workflow not found." });
    const run = await executeWorkflow(workflow, { event: "manual", userId: req.user.id }, { skipApproval: true });
    return res.json({ success: true, run, workflow });
  } catch (err) { next(err); }
};

const getPendingApprovals = async (req, res, next) => {
  try {
    const workflows = await Workflow.find({ "pendingApproval.status": "pending" }).lean();
    return res.json({ success: true, workflows });
  } catch (err) { next(err); }
};

const approveWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ success: false, message: "Workflow not found." });
    if (!workflow.pendingApproval || workflow.pendingApproval.status !== "pending") {
      return res.status(400).json({ success: false, message: "No pending approval to approve." });
    }
    workflow.pendingApproval.status = "approved";
    workflow.pendingApproval.reviewedBy = req.user.id;
    workflow.pendingApproval.reviewedAt = new Date();
    workflow.pendingApproval.decision = req.body.decision || "approved";
    await workflow.save();

    const run = await executeWorkflow(workflow, workflow.pendingApproval.payload, { skipApproval: true });
    workflow.pendingApproval = null;
    await workflow.save();
    return res.json({ success: true, workflow, run });
  } catch (err) { next(err); }
};

const rejectWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ success: false, message: "Workflow not found." });
    if (!workflow.pendingApproval || workflow.pendingApproval.status !== "pending") {
      return res.status(400).json({ success: false, message: "No pending approval to reject." });
    }
    workflow.pendingApproval.status = "rejected";
    workflow.pendingApproval.reviewedBy = req.user.id;
    workflow.pendingApproval.reviewedAt = new Date();
    workflow.pendingApproval.decision = req.body.decision || "rejected";
    const note = req.body.note || "Rejected by admin.";
    workflow.pendingApproval.note = note;
    await workflow.save();
    return res.json({ success: true, workflow });
  } catch (err) { next(err); }
};

const triggerWebhookEndpoint = async (req, res, next) => {
  try {
    const pathKey = req.params.path;
    const secret = req.headers["x-workflow-secret"] || req.query.secret || "";
    const result = await triggerWebhook(pathKey, secret, {
      headers: req.headers,
      query: req.query,
      body: req.body,
      params: req.params,
    });
    if (!result) return res.status(404).json({ success: false, message: "No webhook workflow matched or secret invalid." });
    return res.json({ success: true, message: "Webhook workflow triggered.", run: result });
  } catch (err) { next(err); }
};

module.exports = {
  getWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  runWorkflow,
  getPendingApprovals,
  approveWorkflow,
  rejectWorkflow,
  triggerWebhookEndpoint,
};
