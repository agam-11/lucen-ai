const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");
const {
  analyzePriorArt,
  updateAnalysisStatus,
} = require("../controllers/analysisController");

const router = express.Router();

router.patch("/:analysisId/status", authenticateToken, updateAnalysisStatus);

module.exports = router;
