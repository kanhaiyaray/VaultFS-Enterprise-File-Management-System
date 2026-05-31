/**
 * server/routes/workflows.js
 * Workflow automation routes and webhook endpoint.
 */
const express = require("express");
const { protect } = require("../middleware/auth");
const {
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
} = require("../controllers/workflowController");

const router = express.Router();

const adminGuard = [protect, (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required." });
  }
  next();
}];

router.post("/webhook/:path", triggerWebhookEndpoint);
router.get("/", adminGuard, getWorkflows);
router.get("/pending-approvals", adminGuard, getPendingApprovals);
router.post("/", adminGuard, createWorkflow);
router.get("/:id", adminGuard, getWorkflow);
router.put("/:id", adminGuard, updateWorkflow);
router.delete("/:id", adminGuard, deleteWorkflow);
router.post("/:id/run", adminGuard, runWorkflow);
router.post("/:id/approve", adminGuard, approveWorkflow);
router.post("/:id/reject", adminGuard, rejectWorkflow);

module.exports = router;
