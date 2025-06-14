const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const {
  createNewCase,
  getAllCases,
  getCaseDetails,
  uploadManualPriorArt,
  requestChanges,
} = require("../controllers/caseController");
const {
  extractKeywords,
  searchWithKeywords,
} = require("../controllers/searchController");
const {
  generateDraftSection,
  saveDraftSection,
  getDraftSection,
} = require("../controllers/draftController");
const { analyzePriorArt } = require("../controllers/analysisController");

const router = express.Router();

router.post("/", authenticateToken, createNewCase);
router.get("/", authenticateToken, getAllCases);
router.get("/:caseId", authenticateToken, getCaseDetails);
router.post(
  "/:caseId/manual-prior-art",
  authenticateToken,
  upload.single("documentFile"),
  uploadManualPriorArt
);
router.post("/:caseId/request-changes", authenticateToken, requestChanges);

// searchRoute
router.post("/:caseId/extract-keywords", authenticateToken, extractKeywords);
router.post("/:caseId/search", authenticateToken, searchWithKeywords);
// draftRoute
router.post("/:caseId/draft-section", authenticateToken, generateDraftSection);
router.put("/:caseId/draft-section", authenticateToken, saveDraftSection);
router.get(
  "/:caseId/draft-section/:sectionType",
  authenticateToken,
  getDraftSection
);
// analyseRoute
router.post("/:caseId/analyze-prior-art", authenticateToken, analyzePriorArt);

module.exports = router;
