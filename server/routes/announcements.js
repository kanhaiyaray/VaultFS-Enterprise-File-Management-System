const express = require("express");
const { protect } = require("../middleware/auth");
const { getAnnouncements } = require("../controllers/adminController");

const router = express.Router();

router.get("/", protect, getAnnouncements);

module.exports = router;
