/**
 * server/routes/ai.js
 * VaultFS AI routes for file suggestions, duplicate similarity, and image descriptions.
 */
const express = require("express");
const { protect } = require("../middleware/auth");
const {
  getFolderSuggestions,
  getDuplicateSimilarity,
  searchContent,
  describeImage,
} = require("../controllers/aiController");

const router = express.Router();

router.post("/folder-suggestions", protect, getFolderSuggestions);
router.get("/duplicate-similarity", protect, getDuplicateSimilarity);
router.get("/search", protect, searchContent);
router.post("/images/:id/describe", protect, describeImage);

module.exports = router;
