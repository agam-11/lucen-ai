require("dotenv").config();
const { v4: uuidv4 } = require("uuid"); // Import uuid
const express = require("express");
const cors = require("cors");
const supabaseAdmin = require("./config/supabaseClient");
const authenticateToken = require("./middleware/authMiddleware");
const multer = require("multer");
const { OpenAI } = require("openai");
const { getJson } = require("serpapi");

const app = express();
const PORT = process.env.PORT || 3001; // Backend port

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

// This endpoint gets existing draft data AND checks submission status.
app.get("/api/idd/:token/data", async (req, res) => {
  const { token } = req.params;

  try {
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from("cases")
      .select("id")
      .eq("idd_secure_link_token", token)
      .single();

    if (caseError) {
      throw new Error("Invalid or expired submission link.");
    }

    const { data: disclosureData, error: disclosureError } = await supabaseAdmin
      .from("invention_disclosures")
      .select("data, submitted_at") // Also select the submitted_at timestamp
      .eq("case_id", caseData.id)
      .single();

    // If no disclosure is found, it's not submitted and has no data.
    if (disclosureError) {
      return res.json({ data: {}, isSubmitted: false });
    }

    // Send back the data, and a flag indicating if it's been submitted.
    res.json({
      data: disclosureData.data || {},
      isSubmitted: !!disclosureData.submitted_at, // '!!' turns the value into a true boolean
    });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// This endpoint saves a DRAFT of the IDD form data.
app.put("/api/idd/:token", async (req, res) => {
  const { token } = req.params;
  const formData = req.body; // The partial form data

  try {
    // 1. Find the case to get its ID
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from("cases")
      .select("id")
      .eq("idd_secure_link_token", token)
      .single();

    if (caseError || !caseData) {
      throw new Error("Invalid or expired submission link.");
    }
    const caseId = caseData.id;

    // 2. Use 'upsert' to either CREATE a new disclosure or UPDATE an existing one.
    // 'upsert' is perfect for "save draft" functionality.
    const { error: upsertError } = await supabaseAdmin
      .from("invention_disclosures")
      .upsert(
        {
          case_id: caseId,
          data: formData,
          // We DO NOT set 'submitted_at' here, because this is just a draft.
        },
        { onConflict: "case_id" } // If a row with this case_id already exists, update it.
      );

    if (upsertError) {
      throw upsertError;
    }

    res.status(200).json({ message: "Draft saved successfully!" });
  } catch (error) {
    console.error("Error saving draft:", error.message);
    res.status(400).json({ message: error.message || "Failed to save draft." });
  }
});

// This endpoint handles the submission of the client's IDD form.
app.post("/api/idd/:token", upload.single("drawingFile"), async (req, res) => {
  const { token } = req.params;
  const formData = req.body; // Text fields from the form
  const file = req.file; // The uploaded file from multer

  try {
    // --- 1. Find the case that corresponds to this unique token ---
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from("cases")
      .select("id, firm_user_id") // We need firm_user_id for the file path
      .eq("idd_secure_link_token", token)
      .single();

    if (caseError || !caseData) {
      throw new Error("Invalid or expired submission link.");
    }
    const { id: caseId, firm_user_id: firmUserId } = caseData;

    // --- 2. If a file was uploaded, handle it ---
    if (file) {
      // We'll create a unique path for the file to prevent overwrites
      const filePath = `${firmUserId}/${caseId}/${Date.now()}-${
        file.originalname
      }`; // Upload the file to Supabase Storage
      const { error: uploadError } = await supabaseAdmin.storage
        .from("case-files")
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Save file metadata to our 'case_documents' table
      const { error: docError } = await supabaseAdmin
        .from("case_documents")
        .insert({
          case_id: caseId,
          file_name: file.originalname,
          file_path: filePath,
          storage_bucket: "case-files",
        });

      if (docError) {
        throw docError;
      }
    }

    // --- 3. Insert the form's text data into 'invention_disclosures' ---
    const { error: disclosureError } = await supabaseAdmin
      .from("invention_disclosures")
      .upsert(
        {
          case_id: caseId,
          data: formData,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "case_id" }
      );
    if (disclosureError) {
      throw disclosureError;
    }

    // --- 4. Update the status of the original case ---
    const { error: updateError } = await supabaseAdmin
      .from("cases")
      .update({ status: "IDD Submitted" })
      .eq("id", caseId);
    if (updateError) {
      console.error("Could not update case status:", updateError);
    }

    // --- 5. Send a success response ---
    res
      .status(200)
      .json({ message: "Invention disclosure submitted successfully!" });
  } catch (error) {
    console.error("Error processing IDD submission:", error.message);
    res
      .status(400)
      .json({ message: error.message || "Failed to process submission." });
  }
});

// This endpoint gets all details for a single case
app.get("/api/cases/:caseId", authenticateToken, async (req, res) => {
  const { caseId } = req.params;
  const firmUserId = req.user.sub; // Get user ID from our auth middleware

  try {
    // 1. Fetch the main case details, ensuring the user owns this case
    const { data: caseDetails, error: caseError } = await supabaseAdmin
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .eq("firm_user_id", firmUserId) // Security check: user must own the case
      .single();

    if (caseError) {
      // This will throw an error if no row is found, which is correct for security
      throw new Error(
        "Case not found or you don't have permission to view it."
      );
    }

    // 2. Fetch the associated invention disclosure
    const { data: disclosure, error: disclosureError } = await supabaseAdmin
      .from("invention_disclosures")
      .select("*")
      .eq("case_id", caseId)
      .single();
    if (disclosureError) {
      console.error("Could not fetch disclosure:", disclosureError.message);
    }

    // 3. Fetch associated documents
    const { data: documents, error: docError } = await supabaseAdmin
      .from("case_documents")
      .select("*")
      .eq("case_id", caseId);
    if (docError) {
      console.error("Could not fetch documents:", docError.message);
    }

    // --- NEW LOGIC: Fetch the latest prior art search for this case ---
    const { data: latestSearch, error: searchError } = await supabaseAdmin
      .from("prior_art_searches")
      .select("keywords, results")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false }) // Get the newest search first
      .limit(1) // We only want the single most recent one
      .single(); // Get it as an object, not an array

    if (searchError) {
      console.error("Could not fetch prior art search:", searchError.message);
    }
    // --- END OF NEW LOGIC ---

    // 4. (Bonus) Create secure, time-limited download links for each document
    let signedDocuments = [];
    if (documents && documents.length > 0) {
      const filePaths = documents.map((doc) => doc.file_path);
      const { data: signedUrlsData, error: signedUrlError } =
        await supabaseAdmin.storage
          .from("case-files")
          .createSignedUrls(filePaths, 60 * 60); // Links are valid for 1 hour

      if (signedUrlError) {
        throw signedUrlError;
      }

      // Match original document info with its new signed URL
      signedDocuments = documents.map((doc) => {
        const foundUrl = signedUrlsData.find(
          (urlData) => urlData.path === doc.file_path
        );
        return {
          ...doc,
          signedUrl: foundUrl ? foundUrl.signedUrl : null,
        };
      });
    }

    // 5. Combine all data into a single response object
    const responseData = {
      ...caseDetails,
      invention_disclosure: disclosure, // Nested disclosure object
      documents: signedDocuments, // Nested documents array
      latest_search: latestSearch,
    };

    res.json(responseData);
  } catch (error) {
    console.error("Error fetching case details:", error.message);
    res
      .status(404)
      .json({ message: error.message || "Failed to fetch case details." });
  }
});

// This endpoint gets existing draft data for a given token.
app.get("/api/idd/:token/data", async (req, res) => {
  const { token } = req.params;

  try {
    // 1. Find the case that corresponds to this token to get its ID
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from("cases")
      .select("id")
      .eq("idd_secure_link_token", token)
      .single();

    if (caseError || !caseData) {
      throw new Error("Invalid or expired submission link.");
    }
    const caseId = caseData.id;

    // 2. Look for an existing invention disclosure for that case
    const { data: disclosureData, error: disclosureError } = await supabaseAdmin
      .from("invention_disclosures")
      .select("data") // We only need the 'data' field
      .eq("case_id", caseId)
      .single();

    // If a disclosure exists, send its data. If not, send an empty object.
    if (disclosureError) {
      // This will likely error if no row is found, which is okay.
      // It just means no draft has been saved yet.
      return res.json({});
    }

    res.json(disclosureData.data || {});
  } catch (error) {
    console.error("Error fetching draft data:", error.message);
    res.status(404).json({ message: error.message });
  }
});

// This endpoint uses an LLM to extract keywords from a submitted IDD
app.post(
  "/api/cases/:caseId/extract-keywords",
  authenticateToken,
  async (req, res) => {
    const { caseId } = req.params;
    const firmUserId = req.user.sub;

    try {
      // 1. Security Check: Make sure the user owns the case
      const { data: caseData, error: caseError } = await supabaseAdmin
        .from("cases")
        .select("id")
        .eq("id", caseId)
        .eq("firm_user_id", firmUserId)
        .single();
      if (caseError) {
        throw new Error("Case not found or permission denied.");
      }

      // 2. Fetch the invention disclosure data for this case
      const { data: disclosureData, error: disclosureError } =
        await supabaseAdmin
          .from("invention_disclosures")
          .select("data")
          .eq("case_id", caseId)
          .single();
      if (disclosureError) {
        throw new Error("Invention disclosure not found for this case.");
      }

      // 3. Prepare the text content for the AI prompt
      const idd = disclosureData.data;
      const textForAI = `
      Title: ${idd.inventionTitle}
      Background: ${idd.background}
      Detailed Description: ${idd.detailedDescription}
      Novelty: ${idd.novelty}
    `;

      // 4. Create the prompt for the AI
      //   const prompt = `
      //   Based on the following invention disclosure text, extract a list of 5 to 10 relevant and specific technical keywords or short phrases suitable for a patent prior art search. Return the keywords as a single, comma-separated string.

      //   Invention Text:
      //   """
      //   ${textForAI}
      //   """

      //   Keywords:
      // `;
      const prompt = `
  You are an expert patent keyword extractor. Your task is to analyze the following invention disclosure text and extract the most relevant technical keywords.

  **Instructions:**
  - Identify 5 to 10 specific keywords or short technical phrases.
  - Return ONLY the keywords as a single, comma-separated string.
  - DO NOT include any introductory text, explanations, or conversational phrases like "Here are the keywords:".
  - Your entire response must only be the comma-separated list.

  **Invention Text:**
  """
  ${textForAI}
  """

  **Output:**
`;

      // 5. Call the OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3, // Lower temperature for more focused output
        max_tokens: 100,
      });

      const keywordsString = response.choices[0].message.content.trim();

      // 6. Send the keywords back to the frontend
      res.json({ keywords: keywordsString });
    } catch (error) {
      console.error("Error extracting keywords:", error);
      res
        .status(500)
        .json({ message: "Failed to extract keywords.", error: error.message });
    }
  }
);

// Replace your existing search route with this one
app.post("/api/cases/:caseId/search", authenticateToken, async (req, res) => {
  const { caseId } = req.params;
  const { keywords } = req.body;

  // Log the incoming data so we can see what the frontend is sending
  console.log("--- Received Search Request ---");
  console.log("Keywords received:", keywords);

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    console.log("Validation failed: Keywords are missing or not an array.");
    return res.status(400).json({ message: "Keywords are required." });
  }

  const searchQuery = keywords.join(" ");
  console.log(`Formatted search query for SerpApi: "${searchQuery}"`);

  try {
    console.log("Calling SerpApi...");
    const json = await getJson({
      engine: "google_patents",
      q: searchQuery,
      api_key: process.env.SERPAPI_API_KEY,
    });

    // This will only run if the SerpApi call is successful
    console.log("SerpApi call successful. Sending results to frontend.");
    const searchResults = json.organic_results || []; // Use empty array as a fallback
    console.log(searchResults);
    // --- NEW LOGIC: Save the search to the database ---
    const { error: saveError } = await supabaseAdmin
      .from("prior_art_searches")
      .insert({
        case_id: caseId,
        keywords: keywords, // The array of keywords from the request
        results: searchResults, // The array of results from SerpApi
      });

    if (saveError) {
      // If saving fails, we log it but still send the results back to the user
      console.error("Error saving search results:", saveError);
    }
    // --- END OF NEW LOGIC ---

    res.json(searchResults);
  } catch (error) {
    // This will run if the SerpApi call throws a catchable error
    console.error("!!! ERROR in SerpApi try...catch block:", error);
    res.status(500).json({
      message: "Failed to perform patent search.",
      error: error.message,
    });
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
