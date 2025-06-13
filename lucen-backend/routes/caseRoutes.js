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

module.exports = router;
