require("dotenv").config();
const { v4: uuidv4 } = require("uuid"); // Import uuid
const express = require("express");
const cors = require("cors");
const supabaseAdmin = require("./config/supabaseClient");
const authenticateToken = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3001; // Backend port

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Middleware to parse JSON bodies

app.get("/", (req, res) => {
  res.send("Lucen Backend is running!");
});

// --- CREATE A NEW CASE (PROTECTED) ---
app.post("/api/cases", authenticateToken, async (req, res) => {
  const firmUserId = req.user.sub; // Get user ID from our auth middleware
  const { client_name, client_email, invention_title_snippet } = req.body;

  // Validate required fields
  if (!client_name || !client_email) {
    return res
      .status(400)
      .json({ message: "Client name and email are required." });
  }

  try {
    const secureToken = uuidv4(); // Generate a unique token for the client link

    const { data, error } = await supabaseAdmin
      .from("cases")
      .insert([
        {
          firm_user_id: firmUserId,
          client_name: client_name,
          client_email: client_email,
          invention_title_snippet: invention_title_snippet,
          idd_secure_link_token: secureToken,
          // The 'status' column will use its default value 'Awaiting Client IDD'
        },
      ])
      .select() // This returns the row that was just inserted
      .single(); // Use .single() if you expect only one row back

    if (error) {
      throw error;
    }

    res.status(201).json(data); // Send back the newly created case data with a 201 status
  } catch (error) {
    console.error("Error creating case:", error.message);
    res
      .status(500)
      .json({ message: "Failed to create case.", error: error.message });
  }
});

// --- GET ALL CASES FOR THE LOGGED-IN USER ---
app.get("/api/cases", authenticateToken, async (req, res) => {
  // The user's ID is available from our middleware
  const firmUserId = req.user.sub;

  try {
    // Use the admin client to select cases from the database
    const { data, error } = await supabaseAdmin
      .from("cases") // from our 'cases' table
      .select("*") // get all columns
      .eq("firm_user_id", firmUserId); // where the firm_user_id matches the logged-in user

    if (error) {
      throw error;
    }

    // Send the list of cases back to the frontend
    res.json(data);
  } catch (error) {
    console.error("Error fetching cases:", error.message);
    res
      .status(500)
      .json({ message: "Failed to fetch cases.", error: error.message });
  }
});

// --- TEST ROUTE ---
app.get("/api/test-route", (req, res) => {
  // This sends a JSON response back to the client that calls it
  res.json({ message: "👋 Hello from your Express backend!" });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
