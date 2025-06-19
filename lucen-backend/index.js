const express = require("express");
const cors = require("cors");
// const supabaseAdmin = require("./config/supabaseClient");
const authenticateToken = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3001; // Backend port

const multer = require("multer");
const storage = multer.memoryStorage();

const caseRoutes = require("./routes/caseRoutes");
const iddRoutes = require("./routes/iddRoutes");
const searchRoutes = require("./routes/searchRoutes");
const analysisRoutes = require("./routes/analysisRoutes");
const draftRoutes = require("./routes/draftRoutes");
const documentRoutes = require("./routes/documentRoutes");
const ragRoutes = require("./routes/ragRoutes");
const commandRoutes = require("./routes/commandRoutes");
const draftImageRoutes = require("./routes/draftImageRoutes");

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Middleware to parse JSON bodies

app.get("/", (req, res) => {
  res.send("Lucen Backend is running!");
});

// --- CREATE A NEW CASE (PROTECTED) ---
// createNewCase
app.use("/api/cases", caseRoutes);
app.use("/api/idd", iddRoutes);
app.use("/api/analyses", analysisRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/rag", ragRoutes);
app.use("/api/command", commandRoutes);
app.use("/api/drafts", draftRoutes);
// Add this line in server.js
app.use("/api/drafts", draftImageRoutes);

// --- TEST ROUTE ---
app.get("/api/test-route", (req, res) => {
  // This sends a JSON response back to the client that calls it
  res.json({ message: "👋 Hello from your Express backend!" });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
