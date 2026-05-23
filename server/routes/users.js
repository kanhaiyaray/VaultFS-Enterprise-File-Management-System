/**
 * server/routes/users.js
 * Mount with: app.use("/api/users", require("./routes/users"));
 *
 * Also add to server/routes/auth.js:
 *   const { changePassword } = require("../controllers/notificationController");
 *   router.put("/change-password", protect, changePassword);
 */
const express = require("express");
const { protect } = require("../middleware/auth");
const {
  updateNotificationPrefs,
  getMe,
  updateMe,
  deleteMe,
  exportUserData,
} = require("../controllers/notificationController");

const router = express.Router();

// ── Current user (self) ───────────────────────────────────────────────────────
router.get("/me",                    protect, getMe);
router.put("/me",                    protect, updateMe);
router.delete("/me",                 protect, deleteMe);
router.get("/me/export",             protect, exportUserData);
router.put("/me/notification-prefs", protect, updateNotificationPrefs);

module.exports = router;
