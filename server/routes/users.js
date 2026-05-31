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
const Device = require("../models/Device");
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

// ── Device management (for security & suspicious login detection) ────────────
// Get all devices for the current user
router.get("/devices", protect, async (req, res, next) => {
  try {
    const devices = await Device.find({ user: req.user.id }).sort({ lastSeenAt: -1 });
    res.json({ success: true, devices });
  } catch (err) { next(err); }
});

// Trust a device (mark as trusted to bypass suspicious login checks)
router.post("/devices/:id/trust", protect, async (req, res, next) => {
  try {
    const device = await Device.findOne({ _id: req.params.id, user: req.user.id });
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }
    
    device.isTrusted = true;
    device.isSuspicious = false;
    device.suspicionReason = null;
    await device.save();
    
    res.json({ success: true, message: 'Device trusted' });
  } catch (err) { next(err); }
});

// Remove/revoke a device (revoke trust and remove from device list)
router.delete("/devices/:id", protect, async (req, res, next) => {
  try {
    const device = await Device.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }
    res.json({ success: true, message: 'Device removed' });
  } catch (err) { next(err); }
});

module.exports = router;