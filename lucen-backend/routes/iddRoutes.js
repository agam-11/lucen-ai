const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");
const {
  getIddData,
  saveIddDraft,
  submitIdd,
  submitClientReview,
} = require("../controllers/iddController");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router.get("/:token/data", getIddData);
router.put("/:token", saveIddDraft);
router.post("/:token", upload.single("drawingFile"), submitIdd);
router.patch("/:token/documents/:docId/review", submitClientReview);

module.exports = router;
