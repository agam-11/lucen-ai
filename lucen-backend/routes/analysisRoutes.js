const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");
const {
  extractKeywords,
  searchWithKeywords,
} = require("../controllers/searchController");
const {
  analyzePriorArt,
  updateAnalysisStatus,
} = require("../controllers/analysisController");

const router = express.Router();

router.post(
  "/cases/:caseId/analyze-prior-art",
  authenticateToken,
  analyzePriorArt
);

router.patch(
  "/analyses/:analysisId/status",
  authenticateToken,
  updateAnalysisStatus
);

module.exports = router;
