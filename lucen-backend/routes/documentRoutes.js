const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");

const { shareDocument } = require("../controllers/documentController");

const router = express.Router();

router.patch("/:docId/share", authenticateToken, shareDocument);

module.exports = router;
