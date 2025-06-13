const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");
const {
  generateDraftSection,
  saveDraftSection,
  getDraftSection,
} = require("../controllers/draftController");

const router = express.Router();

router.post("/:caseId/draft-section", authenticateToken, generateDraftSection);
router.put("/:caseId/draft-section", authenticateToken, saveDraftSection);
router.get(
  "/:caseId/draft-section/:sectionType",
  authenticateToken,
  getDraftSection
);

module.exports = router;
