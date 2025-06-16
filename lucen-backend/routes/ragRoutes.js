const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");
const { buildMemoryForCase } = require("../controllers/ragController");
const router = express.Router();

router.post("/:caseId/build-memory", authenticateToken, buildMemoryForCase);

module.exports = router;
