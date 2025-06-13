const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");
const {
  extractKeywords,
  searchWithKeywords,
} = require("../controllers/searchController");

const router = express.Router();

router.post("/:caseId/extract-keywords", authenticateToken, extractKeywords);
router.post("/:caseId/search", authenticateToken, searchWithKeywords);

module.exports = router;
