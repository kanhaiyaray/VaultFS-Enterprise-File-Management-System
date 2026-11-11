/**
 * server/controllers/analyticsController.js
 */
const svc = require("../services/analyticsService");

const wrap = (fn) => async (req, res, next) => {
  try {
    const range = req.query.range || "30d";
    const data = await fn(req.user, range);
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};

const getOverview   = wrap(svc.getOverview);
const getStorage    = wrap(svc.getStorage);
const getFiles      = wrap(svc.getFiles);
const getSharing    = wrap(svc.getSharing);
const getActivity   = wrap(svc.getActivity);
const getSecurity   = wrap(svc.getSecurity);
const getWorkflows  = wrap(svc.getWorkflows);
const getUserGrowth = wrap(svc.getUserGrowth);

const exportCsv = async (req, res, next) => {
  try {
    const range = req.query.range || "30d";
    const csv = await svc.buildCsvReport(req.user, range);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=vaultfs-analytics-" + range + "-" + Date.now() + ".csv");
    res.send(csv);
  } catch (err) { next(err); }
};

module.exports = { getOverview, getStorage, getFiles, getSharing, getActivity, getSecurity, getWorkflows, getUserGrowth, exportCsv };
