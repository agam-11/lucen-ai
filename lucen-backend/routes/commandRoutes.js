const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");
const { handleAiCommand } = require("../controllers/commandController");
const router = express.Router();

router.post("/:caseId/command", authenticateToken, handleAiCommand);

module.exports = router;
