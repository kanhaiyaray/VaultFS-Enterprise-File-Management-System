/**
 * server/routes/admin.js
 * Mount with: app.use("/api/admin", require("./routes/admin"));
 */
const express = require("express");
const { protect } = require("../middleware/auth");
const {
  getUsers, getUser, updateUser, deleteUser, createUser, exportUsers,
  banUser, unbanUser, forcePasswordReset, impersonateUser,
  getAllFiles, adminDeleteFile, getStorageHogs, getOrphanedFiles,
  cleanupOrphanedFiles, getDuplicateFiles,
  getSystemStats,
  broadcastAnnouncement, getAnnouncements, removeAnnouncement,
  getBranding, updateBranding,
  adminFullTextSearch,
  getActivities, getActivityStats, getUserActivities,
} = require("../controllers/adminController");

const router = express.Router();

const adminGuard = [protect, (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required." });
  }
  next();
}];

// ── Stats
router.get("/stats", adminGuard, getSystemStats);

// ── User management
router.get("/users",              adminGuard, getUsers);
router.get("/users/export",       adminGuard, exportUsers);
router.post("/users/create",      adminGuard, createUser);
router.get("/users/:id",          adminGuard, getUser);
router.put("/users/:id",          adminGuard, updateUser);
router.delete("/users/:id",       adminGuard, deleteUser);
router.post("/users/:id/ban",     adminGuard, banUser);
router.post("/users/:id/unban",   adminGuard, unbanUser);
router.post("/users/:id/force-reset",   adminGuard, forcePasswordReset);
router.post("/users/:id/impersonate",   adminGuard, impersonateUser);
router.get("/users/:id/activities",     adminGuard, getUserActivities);

// ── File oversight
router.get("/files",                    adminGuard, getAllFiles);
router.get("/files/search",             adminGuard, adminFullTextSearch);
router.get("/files/storage-hogs",       adminGuard, getStorageHogs);
router.get("/files/orphaned",           adminGuard, getOrphanedFiles);
router.post("/files/orphaned/cleanup",  adminGuard, cleanupOrphanedFiles);
router.get("/files/duplicates",         adminGuard, getDuplicateFiles);
router.delete("/files/:id",             adminGuard, adminDeleteFile);

// ── Activity Log
router.get("/activities",       adminGuard, getActivities);
router.get("/activities/stats", adminGuard, getActivityStats);

// ── Branding
router.get("/branding",  adminGuard, getBranding);
router.put("/branding",  adminGuard, updateBranding);

// ── Announcements
router.get("/announcements", adminGuard, getAnnouncements);
router.post("/announce", adminGuard, broadcastAnnouncement);
router.delete("/announcements/:id", adminGuard, removeAnnouncement);

module.exports = router;
