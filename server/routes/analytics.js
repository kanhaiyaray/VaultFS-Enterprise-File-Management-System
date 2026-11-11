/**
 * server/routes/analytics.js
 */
const express = require("express");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/analyticsController");

const router = express.Router();
router.use(protect);

router.get("/overview",   ctrl.getOverview);
router.get("/storage",    ctrl.getStorage);
router.get("/files",      ctrl.getFiles);
router.get("/sharing",    ctrl.getSharing);
router.get("/activity",   ctrl.getActivity);
router.get("/security",   ctrl.getSecurity);
router.get("/workflows",  ctrl.getWorkflows);
router.get("/users",      ctrl.getUserGrowth);
router.get("/export/csv", ctrl.exportCsv);

module.exports = router;
