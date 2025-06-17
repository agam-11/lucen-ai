const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");
const {
  generateDraftSection,
  saveDraftSection,
  getDraftSection,
  autoSaveVersion,
  createNamedVersion,
  getDraftHistory,
  getDraftVersionContent,
  restoreVersion,
  getLatestDraft,
} = require("../controllers/draftController");

const router = express.Router();

// router.post("/:caseId/draft-section", authenticateToken, generateDraftSection);
// router.put("/:caseId/draft-section", authenticateToken, saveDraftSection);
// router.get(
// "/:caseId/draft-section/:sectionType",
// authenticateToken,
// getDraftSection
// );
// works with oldDraftController
// router.post("/:caseId/versions", authenticateToken, autoSaveVersion);

router.put("/:caseId/auto-save", authenticateToken, autoSaveVersion);

router.post("/:caseId/milestones", authenticateToken, createNamedVersion);
router.get("/:caseId/history", authenticateToken, getDraftHistory);
router.get("/versions/:versionId", authenticateToken, getDraftVersionContent);
router.post("/versions/:versionId/restore", authenticateToken, restoreVersion);
router.get("/:caseId/latest", authenticateToken, getLatestDraft);

module.exports = router;
