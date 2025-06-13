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

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Middleware to parse JSON bodies

app.get("/", (req, res) => {
  res.send("Lucen Backend is running!");
});

// --- CREATE A NEW CASE (PROTECTED) ---
// createNewCase
app.post("/api/cases", caseRoutes);

// --- GET ALL CASES FOR THE LOGGED-IN USER ---

app.use("/api/cases", caseRoutes);

// This endpoint gets existing draft data AND checks submission status.
// getIddData
app.use("/api/idd", iddRoutes);

// This endpoint saves a DRAFT of the IDD form data.
// saveIddDraft
app.use("/api/idd", iddRoutes);

// This endpoint handles the submission of the client's IDD form.
// submitIdd
app.use("/api/idd", iddRoutes);

// This endpoint gets all details for a single case
// getCaseDetals
app.use("/api/cases", caseRoutes);

// This endpoint uses an LLM to extract keywords from a submitted IDD
app.use("/api/cases", searchRoutes);

// Replace your existing search route with this one
app.use("/api/cases", searchRoutes);

// This endpoint takes a specific prior art document and analyzes it against the IDD
app.use("/api", analysisRoutes);
// updateAnalysisStatus
app.use("/api", analysisRoutes);

// --- PASTE THIS NEW DRAFTING ROUTE ---
// generateDraftSection
app.use("/api/cases", draftRoutes);

// This endpoint saves (upserts) a draft for a specific section of a case
// saveDraftSection
app.use("/api/cases", draftRoutes);

// This endpoint gets a specific saved draft for a case
// getDraftSection
app.use("/api/cases", draftRoutes);

// This endpoint handles a firm user manually uploading a prior art document
// uploadManualPriorArt
app.use("/api/cases", caseRoutes);

// This endpoint allows a firm to request changes to a submitted IDD
// requestChanges
app.use("/api/cases", caseRoutes);

// This route lets a firm user share a document with the client
// shareDocument
app.use("/api/documents", documentRoutes);

// This route lets the client submit their review of a shared document
// submitClientReview
app.use("/api/idd", iddRoutes);

// --- TEST ROUTE ---
app.get("/api/test-route", (req, res) => {
  // This sends a JSON response back to the client that calls it
  res.json({ message: "👋 Hello from your Express backend!" });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
