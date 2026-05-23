const express = require("express");
const { protect } = require("../middleware/auth");
const {
  getWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook,
} = require("../controllers/webhookController");

const router = express.Router();

router.get("/",          protect, getWebhooks);
router.post("/",         protect, createWebhook);
router.put("/:id",       protect, updateWebhook);
router.delete("/:id",    protect, deleteWebhook);
router.post("/:id/test", protect, testWebhook);

module.exports = router;
