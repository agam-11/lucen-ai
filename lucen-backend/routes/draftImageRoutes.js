// lucen-backend/routes/draftImageRoutes.js
const express = require("express");
const router = express.Router();
const draftImageController = require("../controllers/draftImageController");
const authenticateToken = require("../middleware/authMiddleware");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

// Define the route: POST /:draftId/images
router.post(
  "/:caseId/images",
  authenticateToken,
  upload.single("imageFile"), // This uses multer to handle a single file named 'imageFile'
  draftImageController.uploadDraftImage
);

module.exports = router;
