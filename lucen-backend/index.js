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
// // --- PASTE THIS NEW BLOCK HERE ---
// // Middleware to prevent API response caching
// app.use((req, res, next) => {
//   res.setHeader(
//     "Cache-Control",
//     "no-store, no-cache, must-revalidate, proxy-revalidate"
//   );
//   res.setHeader("Pragma", "no-cache");
//   res.setHeader("Expires", "0");
//   res.setHeader("Surrogate-Control", "no-store");
//   next();
// });
// // --- END OF NEW BLOCK ---

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
  // --- STEP 1: Log the incoming request ---
  console.log(`--- LOG: Received request for /api/idd/${token}/data ---`);
  console.log(`--- LOG: Timestamp: ${new Date().toISOString()} ---`);

  console.log("hie dawg from server");
  try {
    console.log(`--- LOG: Looking up case with token: ${token} ---`);

    const { data: caseData, error: caseError } = await supabaseAdmin
      .from("cases")
      .select("id, status")
      .eq("idd_secure_link_token", token)
      .single();

    if (caseError) {
      console.error(
        `--- LOG: ERROR finding case. Supabase error:`,
        caseError.message
      );

      throw new Error("Invalid or expired submission link.");
    }

    const { data: disclosureData, error: disclosureError } = await supabaseAdmin
      .from("invention_disclosures")
      .select("data, submitted_at, firm_comments") // Also select the submitted_at timestamp
      .eq("case_id", caseData.id)
      .single();

    // --- NEW: Fetch messages ---
    // const { data: messages, error: messagesError } = await supabaseAdmin
    //   .from("communication_log")
    //   .select("*")
    //   .eq("case_id", caseData.id)
    //   .order("created_at", { ascending: true });
    // if (messagesError) {
    //   console.error(
    //     "Could not fetch messages for client:",
    //     messagesError.message
    //   );
    // }
    // console.log("dserver");

    // If no disclosure is found, it's not submitted and has no data.
    if (disclosureError) {
      return res.json({
        data: {},
        isSubmitted: false,
        // messages: messages || [],
        caseStatus: caseData.status, // <-- The crucial new piece of info
      });
    }

    // --- NEW: Fetch shared documents ---
    const { data: shared_documents } = await supabaseAdmin
      .from("case_documents")
      .select("*")
      .eq("case_id", caseData.id)
      .eq("is_shared", true) // Only get documents marked as shared
      .order("created_at", { ascending: false });

    let signed_documents = [];
    if (shared_documents && shared_documents.length > 0) {
      const filePaths = shared_documents.map((d) => d.file_path);
      const { data: signedUrlsData } = await supabaseAdmin.storage
        .from("case-files")
        .createSignedUrls(filePaths, 3600);
      if (signedUrlsData) {
        signed_documents = shared_documents.map((doc) => ({
          ...doc,
          signedUrl: signedUrlsData.find((u) => u.path === doc.file_path)
            ?.signedUrl,
        }));
      }
    }
    // --- END OF NEW LOGIC ---
    console.log(
      `--- LOG: Found existing disclosure. Has submitted_at: ${!!disclosureData.submitted_at} ---`
    );
    console.log("--- LOG: Sending final response payload:", responsePayload);

    // Send back the data, and a flag indicating if it's been submitted.
    res.json({
      data: disclosureData.data || {},
      isSubmitted: !!disclosureData.submitted_at, // '!!' turns the value into a true boolean
      // messages: messages || [], // Add messages to the response
      firmComments: disclosureData?.firm_comments || null, // Add the comments to the response
      sharedDocuments: signed_documents, // Add shared documents to the response
      caseStatus: caseData.status, // <-- The crucial new piece of info
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
          document_type: "client_disclosure", // <-- ADD THIS LINE
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
    // if (updateError) {
    //   console.error("Could not update case status:", updateError);
    // }
    if (updateError) {
      console.error(
        "CRITICAL ERROR: Failed to update case status after submission.",
        updateError
      );
      throw updateError; // This makes sure the entire request fails if the status doesn't update.
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

    // --- NEW LOGIC: Fetch ALL prior art analyses for this case ---
    const { data: savedAnalyses, error: analysesError } = await supabaseAdmin
      .from("ai_prior_art_analysis")
      .select("*")
      .eq("case_id", caseId);

    if (analysesError) {
      console.error("Could not fetch saved analyses:", analysesError.message);
    }
    // --- END OF NEW LOGIC ---

    // --- THIS IS THE NEW, SIMPLER LOGIC FOR MESSAGES ---
    // 1. Fetch the raw messages
    // const { data: rawMessages, error: messagesError } = await supabaseAdmin
    //   .from("communication_log")
    //   .select("*")
    //   .eq("case_id", caseId)
    //   .order("created_at", { ascending: true });
    // if (messagesError) {
    //   console.error("Could not fetch messages:", messagesError.message);
    // }

    // // 2. We need to get the emails for the users who posted
    // // To be efficient, we'll get a unique list of user IDs from the messages
    // const userIds = [...new Set(rawMessages.map((msg) => msg.firm_user_id))];

    // // 3. Fetch the user details for those IDs
    // const { data: users, error: usersError } = await supabaseAdmin
    //   .from("users")
    //   .select("id, email")
    //   .in("id", userIds);
    // if (usersError) {
    //   console.error("Could not fetch user emails:", usersError.message);
    // }

    // // 4. Create a quick lookup map (e.g., {'user-id-123': 'user@email.com'})
    // const userEmailMap = users.reduce((acc, user) => {
    //   acc[user.id] = user.email;
    //   return acc;
    // }, {});

    // // 5. Combine the message data with the user email
    // const messages = rawMessages.map((msg) => ({
    //   ...msg,
    //   firm_user: { email: userEmailMap[msg.firm_user_id] || "Unknown User" },
    // }));
    // --- END OF NEW LOGIC ---
    // --- 3. Safely process the messages to add user emails ---
    // const { data: rawMessages } = await supabaseAdmin
    //   .from("communication_log")
    //   .select("*")
    //   .eq("case_id", caseId)
    //   .order("created_at", { ascending: true });

    // let messages = [];
    // if (rawMessages && rawMessages.length > 0) {
    //   const userIds = [...new Set(rawMessages.map((msg) => msg.firm_user_id))];
    //   const { data: usersData } = await supabaseAdmin
    //     .from("users")
    //     .select("id, email")
    //     .in("id", userIds);

    //   const userEmailMap = (usersData || []).reduce((acc, user) => {
    //     acc[user.id] = user.email;
    //     return acc;
    //   }, {});

    //   messages = rawMessages.map((msg) => ({
    //     ...msg,
    //     firm_user: { email: userEmailMap[msg.firm_user_id] || "Unknown User" },
    //   }));
    // }
    // --- THIS IS THE NEW, SIMPLER LOGIC FOR MESSAGES ---
    // const { data: messagesData, error: messagesError } = await supabaseAdmin
    //   .from("communication_log")
    //   .select("*") // We can just get everything now
    //   .eq("case_id", caseId)
    //   .order("created_at", { ascending: true });

    // if (messagesError) {
    //   console.error("Could not fetch messages:", messagesError.message);
    // }

    // // Manually structure the data to match what the frontend expects
    // const messages = (messagesData || []).map((msg) => ({
    //   ...msg,
    //   firm_user: { email: msg.user_email || "Unknown User" },
    // }));
    // --- END OF NEW LOGIC ---

    // 4. (Bonus) Create secure, time-limited download links for each document
    // let signedDocuments = [];
    // if (documents && documents.length > 0) {
    //   const filePaths = documents.map((doc) => doc.file_path);
    //   const { data: signedUrlsData, error: signedUrlError } =
    //     await supabaseAdmin.storage
    //       .from("case-files")
    //       .createSignedUrls(filePaths, 60 * 60); // Links are valid for 1 hour

    //   if (signedUrlError) {
    //     throw signedUrlError;
    //   }

    //   // Match original document info with its new signed URL
    //   signedDocuments = documents.map((doc) => {
    //     const foundUrl = signedUrlsData.find(
    //       (urlData) => urlData.path === doc.file_path
    //     );
    //     return {
    //       ...doc,
    //       signedUrl: foundUrl ? foundUrl.signedUrl : null,
    //     };
    //   });
    // }
    //  old ^

    // --- THE SAFETY FIX FOR DOCUMENTS ---
    let signedDocuments = [];
    // Only try to process documents if the 'documents' array actually exists and is not empty
    if (documents && documents.length > 0) {
      const filePaths = documents.map((d) => d.file_path);
      const { data: signedUrlsData } = await supabaseAdmin.storage
        .from("case-files")
        .createSignedUrls(filePaths, 3600);
      if (signedUrlsData) {
        signedDocuments = documents.map((doc) => ({
          ...doc,
          signedUrl: signedUrlsData.find((u) => u.path === doc.file_path)
            ?.signedUrl,
        }));
      }
    }
    // --- END OF FIX ---

    // 5. Combine all data into a single response object
    const responseData = {
      ...caseDetails,
      invention_disclosure: disclosure, // Nested disclosure object
      documents: signedDocuments, // Nested documents array
      latest_search: latestSearch,
      analyses: savedAnalyses || [],
      // messages: messages || [], // Add the list of messages to our response
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
// app.get("/api/idd/:token/data", async (req, res) => {
//   const { token } = req.params;
//   console.log("not alive");
//   try {
//     // 1. Find the case that corresponds to this token to get its ID
//     const { data: caseData, error: caseError } = await supabaseAdmin
//       .from("cases")
//       .select("id")
//       .eq("idd_secure_link_token", token)
//       .single();

//     if (caseError || !caseData) {
//       throw new Error("Invalid or expired submission link.");
//     }
//     const caseId = caseData.id;
//     console.log("madarchod endpoint");

//     // 2. Look for an existing invention disclosure for that case
//     const { data: disclosureData, error: disclosureError } = await supabaseAdmin
//       .from("invention_disclosures")
//       .select("data") // We only need the 'data' field
//       .eq("case_id", caseId)
//       .single();

//     // If a disclosure exists, send its data. If not, send an empty object.
//     if (disclosureError) {
//       // This will likely error if no row is found, which is okay.
//       // It just means no draft has been saved yet.
//       return res.json({});
//     }

//     // --- NEW: Fetch messages ---
//     // const { data: messages, error: messagesError } = await supabaseAdmin
//     //   .from("communication_log")
//     //   .select("*")
//     //   .eq("case_id", caseData.id)
//     //   .order("created_at", { ascending: true });
//     // if (messagesError) {
//     //   console.error(
//     //     "Could not fetch messages for client:",
//     //     messagesError.message
//     //   );
//     // }

//     console.log("hi bitch");

//     res.json({
//       data: disclosureData?.data || {},
//       isSubmitted: !!disclosureData?.submitted_at,
//       // messages: messages || [], // Add messages to the response
//     });
//   } catch (error) {
//     console.error("Error fetching draft data:", error.message);
//     res.status(404).json({ message: error.message });
//   }
// });

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

// This endpoint takes a specific prior art document and analyzes it against the IDD
app.post(
  "/api/cases/:caseId/analyze-prior-art",
  authenticateToken,
  async (req, res) => {
    const { caseId } = req.params;
    const firmUserId = req.user.sub;
    const { priorArtDocument } = req.body; // The search result object sent from the frontend

    if (!priorArtDocument) {
      return res
        .status(400)
        .json({ message: "Prior art document is required." });
    }

    try {
      // 1. Security Check & Fetch IDD using an inner join to verify ownership
      const { data: disclosureData, error: disclosureError } =
        await supabaseAdmin
          .from("invention_disclosures")
          .select("data, cases!inner(firm_user_id)")
          .eq("case_id", caseId)
          .eq("cases.firm_user_id", firmUserId)
          .single();

      if (disclosureError) {
        throw new Error("Invention disclosure not found or permission denied.");
      }

      const idd = disclosureData.data;
      const inventionText = `Title: ${idd.inventionTitle}. Description: ${idd.detailedDescription}. Novelty: ${idd.novelty}`;
      const priorArtText = `Title: ${priorArtDocument.title}. Snippet: ${priorArtDocument.snippet}`;

      // 2. Create the detailed analysis prompt for the AI
      const prompt = `
      You are a patent analyst. Your task is to compare an invention disclosure with a piece of prior art. Provide a concise analysis as a JSON object.

      **Instructions:**
      1.  **Summarize Prior Art:** In one sentence, summarize the key concept of the provided Prior Art Document.
      2.  **Identify Similarities:** In one or two bullet points (as a JSON array of strings), list the most significant similarities between the invention and the prior art.
      3.  **Identify Differences:** In one or two bullet points (as a JSON array of strings), list the most significant differences or novel aspects of the invention compared to the prior art.
      4.  **Assign Similarity Score:** On a scale of 1 to 10 (where 10 is nearly identical), give a similarity score as a number.

      Return your response as a valid JSON object only, with the keys: "summary", "similarities", "differences", and "similarityScore". Do not include any other text or explanations.

      **Invention Disclosure Summary:**
      """
      ${inventionText}
      """

      **Prior Art Document:**
      """
      ${priorArtText}
      """
    `;

      // 3. Call the OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // A smart model is needed for this comparison task
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 400,
        response_format: { type: "json_object" }, // Ask for a JSON response directly
      });

      const analysisJson = JSON.parse(response.choices[0].message.content);

      // 4. For now, we just send the analysis back. We will add the logic to save it later.

      // --- THIS IS THE NEW STEP FOR WEEK 12 ---
      // 4. Save the analysis to our database
      const { error: saveError } = await supabaseAdmin
        .from("ai_prior_art_analysis")
        .insert({
          case_id: caseId,
          prior_art_document: priorArtDocument, // Save the original document for reference
          analysis_summary: analysisJson.summary,
          similarities: analysisJson.similarities,
          differences: analysisJson.differences,
          similarity_score: analysisJson.similarityScore,
        });

      if (saveError) {
        // If saving fails, we log it but proceed, as the user still got the analysis.
        console.error("Error saving AI analysis:", saveError);
      }
      // --- END OF NEW STEP ---

      res.json(analysisJson);
    } catch (error) {
      console.error("Error analyzing prior art:", error);
      res.status(500).json({
        message: "Failed to analyze prior art.",
        error: error.message,
      });
    }
  }
);

app.patch(
  "/api/analyses/:analysisId/status",
  authenticateToken,
  async (req, res) => {
    const { analysisId } = req.params;
    const { status } = req.body;
    const firmUserId = req.user.sub;

    if (!["relevant", "dismissed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    try {
      // First, verify the user owns the parent case of the analysis they're trying to update.
      const { data: ownerCheck, error: ownerError } = await supabaseAdmin
        .from("ai_prior_art_analysis")
        .select("cases!inner(firm_user_id)")
        .eq("id", analysisId)
        .eq("cases.firm_user_id", firmUserId)
        .single();

      if (ownerError)
        throw new Error("Analysis not found or permission denied.");

      // If the owner check passes, proceed with the update.
      const { data, error } = await supabaseAdmin
        .from("ai_prior_art_analysis")
        .update({ review_status: status })
        .eq("id", analysisId)
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error("Error updating analysis status:", error);
      res
        .status(500)
        .json({ message: error.message || "Failed to update status." });
    }
  }
);

// --- PASTE THIS NEW DRAFTING ROUTE ---
app.post(
  "/api/cases/:caseId/draft-section",
  authenticateToken,
  async (req, res) => {
    const { caseId } = req.params;
    const firmUserId = req.user.sub;
    // Get the section type and instructions from the frontend request
    const { sectionType, attorneyInstructions } = req.body;

    if (!sectionType) {
      return res.status(400).json({ message: "Section type is required." });
    }

    try {
      // 1. Security Check & Fetch IDD to get the context for our prompt
      const { data: disclosureData, error: disclosureError } =
        await supabaseAdmin
          .from("invention_disclosures")
          .select("data, cases!inner(firm_user_id)")
          .eq("case_id", caseId)
          .eq("cases.firm_user_id", firmUserId)
          .single();

      if (disclosureError) {
        throw new Error("Invention disclosure not found or permission denied.");
      }

      const idd = disclosureData.data;
      const fullInventionText = `
      Title: ${idd.inventionTitle}
      Background: ${idd.background}
      Detailed Description: ${idd.detailedDescription}
      Novelty: ${idd.novelty}
    `;

      // 2. Develop initial prompt templates for different sections
      let specificInstruction = "";
      switch (sectionType) {
        case "Background":
          specificInstruction =
            "Draft a 'Background of the Invention' section. It should describe the general field of the invention and the problems with existing solutions (the prior art).";
          break;
        case "Summary":
          specificInstruction =
            "Draft a 'Summary of the Invention' section. It should provide a broad overview of the invention and its main advantages, without getting into excessive detail.";
          break;
        // You can add more cases here later, like 'Detailed Description'
        default:
          return res
            .status(400)
            .json({ message: "Invalid section type specified." });
      }

      // 3. Create the final, detailed prompt for the AI
      const prompt = `
      You are an expert patent attorney's assistant. Your task is to draft a section of a patent application based on the provided invention disclosure. The tone should be formal, clear, and precise.

      **Section to Draft:** ${sectionType}
      **Your main instruction:** ${specificInstruction}
      **Additional instructions from the attorney:** "${
        attorneyInstructions || "None"
      }"

      **Invention Disclosure Context:**
      """
      ${fullInventionText}
      """

      Draft the requested section below:
    `;

      // 4. Call the OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // A smart model is needed for drafting
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6, // Allow for slightly more creative and natural language
        max_tokens: 800, // Allow for a longer, more detailed response
      });

      const draftText = response.choices[0].message.content.trim();

      // 5. Send the generated draft text back to the frontend
      res.json({ draftText: draftText });
    } catch (error) {
      console.error("Error drafting section:", error);
      res
        .status(500)
        .json({ message: "Failed to draft section.", error: error.message });
    }
  }
);

// This endpoint saves (upserts) a draft for a specific section of a case
app.put(
  "/api/cases/:caseId/draft-section",
  authenticateToken,
  async (req, res) => {
    const { caseId } = req.params;
    const firmUserId = req.user.sub;
    const { sectionType, draftText } = req.body;

    if (!sectionType || draftText === undefined) {
      return res
        .status(400)
        .json({ message: "Section type and draft text are required." });
    }

    try {
      // First, a security check to ensure the user owns the parent case
      const { error: ownerError } = await supabaseAdmin
        .from("cases")
        .select("id")
        .eq("id", caseId)
        .eq("firm_user_id", firmUserId)
        .single();
      if (ownerError) throw new Error("Case not found or permission denied.");

      // Now, upsert the draft content
      const { data, error: upsertError } = await supabaseAdmin
        .from("ai_drafted_sections")
        .upsert(
          {
            case_id: caseId,
            section_type: sectionType,
            content_edited: draftText,
            updated_at: new Date().toISOString(), // Manually set the update timestamp
          },
          { onConflict: "case_id,section_type" } // This is the key for upserting
        )
        .select()
        .single();

      if (upsertError) throw upsertError;

      res
        .status(200)
        .json({ message: "Draft saved successfully!", savedData: data });
    } catch (error) {
      console.error("Error saving draft section:", error);
      res
        .status(500)
        .json({ message: "Failed to save draft.", error: error.message });
    }
  }
);

// This endpoint gets a specific saved draft for a case
app.get(
  "/api/cases/:caseId/draft-section/:sectionType",
  authenticateToken,
  async (req, res) => {
    const { caseId, sectionType } = req.params;
    const firmUserId = req.user.sub;

    try {
      // 1. Security check: First, ensure the user owns the parent case.
      const { error: ownerError } = await supabaseAdmin
        .from("cases")
        .select("id")
        .eq("id", caseId)
        .eq("firm_user_id", firmUserId)
        .single();
      if (ownerError) {
        throw new Error("Case not found or permission denied.");
      }

      // 2. If the security check passes, fetch the specific draft section.
      const { data: draftData, error: draftError } = await supabaseAdmin
        .from("ai_drafted_sections")
        .select("content_edited")
        .eq("case_id", caseId)
        .eq("section_type", sectionType)
        .single();

      // If no draft is found (draftError will be non-null), it's not an error.
      // It just means the user hasn't saved this section yet. Send back empty text.
      if (draftError) {
        return res.json({ draftText: "" });
      }

      res.json({ draftText: draftData.content_edited || "" });
    } catch (error) {
      console.error("Error fetching draft section:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch draft.", error: error.message });
    }
  }
);

// This endpoint handles a firm user manually uploading a prior art document
app.post(
  "/api/cases/:caseId/manual-prior-art",
  authenticateToken,
  upload.single("documentFile"),
  async (req, res) => {
    const { caseId } = req.params;
    const { notes } = req.body; // Get the notes from the form
    const file = req.file; // Get the file from multer
    const firmUserId = req.user.sub;

    if (!file) {
      return res.status(400).json({ message: "A file is required." });
    }

    try {
      // First, a security check to ensure the user owns the case
      const { error: ownerError } = await supabaseAdmin
        .from("cases")
        .select("id")
        .eq("id", caseId)
        .eq("firm_user_id", firmUserId)
        .single();
      if (ownerError) {
        throw new Error("Case not found or permission denied.");
      }

      // Construct the file path using the user and case ID
      const filePath = `${firmUserId}/${caseId}/manual/${Date.now()}-${
        file.originalname
      }`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabaseAdmin.storage
        .from("case-files")
        .upload(filePath, file.buffer, { contentType: file.mimetype });
      if (uploadError) {
        throw uploadError;
      }

      // Save the metadata to our 'case_documents' table
      const { data, error: docError } = await supabaseAdmin
        .from("case_documents")
        .insert({
          case_id: caseId,
          file_name: file.originalname,
          file_path: filePath,
          storage_bucket: "case-files",
          document_type: "manual_prior_art", // Set the type
          notes: notes, // Save the notes
        })
        .select()
        .single();
      if (docError) {
        throw docError;
      }

      res.status(201).json(data);
    } catch (error) {
      console.error("Error uploading manual prior art:", error);
      res
        .status(500)
        .json({ message: "Failed to upload document.", error: error.message });
    }
  }
);

// This endpoint posts a new message to the communication log
// Replace the entire POST messages route with this one
// app.post("/api/cases/:caseId/messages", authenticateToken, async (req, res) => {
//   const { caseId } = req.params;
//   const { message_text } = req.body;
//   const firmUserId = req.user.sub;
//   const firmUserEmail = req.user.email; // We get the email directly from the verified token

//   if (!message_text) {
//     return res.status(400).json({ message: "Message text cannot be empty." });
//   }

//   try {
//     // Security check
//     const { error: ownerError } = await supabaseAdmin
//       .from("cases")
//       .select("id")
//       .eq("id", caseId)
//       .eq("firm_user_id", firmUserId)
//       .single();
//     if (ownerError) {
//       throw new Error("Case not found or permission denied.");
//     }

//     // 1. Insert the new message
//     const { data: newMessage, error } = await supabaseAdmin
//       .from("communication_log")
//       .insert({
//         case_id: caseId,
//         firm_user_id: firmUserId,
//         message_text: message_text,
//       })
//       .select()
//       .single();

//     if (error) {
//       throw error;
//     }

//     // 2. Manually add the user's email to the response object
//     const responseData = {
//       ...newMessage,
//       firm_user: { email: firmUserEmail },
//     };

//     res.status(201).json(responseData);
//   } catch (error) {
//     console.error("Error posting message:", error);
//     res
//       .status(500)
//       .json({ message: "Failed to post message.", error: error.message });
//   }
// });

// lucen-backend/server.js

// This route now saves the user's email with the message
// app.post("/api/cases/:caseId/messages", authenticateToken, async (req, res) => {
//   const { caseId } = req.params;
//   const { message_text } = req.body;
//   const firmUserId = req.user.sub;
//   const firmUserEmail = req.user.email; // We get the email from the verified token

//   if (!message_text) {
//     return res.status(400).json({ message: "Message text cannot be empty." });
//   }

//   try {
//     // Security check is unchanged
//     const { error: ownerError } = await supabaseAdmin
//       .from("cases")
//       .select("id")
//       .eq("id", caseId)
//       .eq("firm_user_id", firmUserId)
//       .single();
//     if (ownerError) {
//       throw new Error("Case not found or permission denied.");
//     }

//     // Insert the new message WITH the email
//     const { data, error } = await supabaseAdmin
//       .from("communication_log")
//       .insert({
//         case_id: caseId,
//         firm_user_id: firmUserId,
//         message_text: message_text,
//         user_email: firmUserEmail, // <-- Save the email here
//         sender_type: "firm",
//       })
//       .select()
//       .single();

//     if (error) {
//       throw error;
//     }

//     // The data we send back to the frontend to instantly display the new message
//     const responseData = {
//       ...data,
//       // We add this firm_user object to match the structure the frontend expects
//       firm_user: { email: firmUserEmail },
//     };

//     res.status(201).json(responseData);
//   } catch (error) {
//     console.error("Error posting message:", error);
//     res
//       .status(500)
//       .json({ message: "Failed to post message.", error: error.message });
//   }
// });

// PASTE THIS NEW ROUTE for clients to post messages
// app.post("/api/idd/:token/messages", async (req, res) => {
//   const { token } = req.params;
//   const { message_text } = req.body;

//   if (!message_text) {
//     return res.status(400).json({ message: "Message text cannot be empty." });
//   }

//   try {
//     // Security check: Find the case via the token
//     const { data: caseData, error: caseError } = await supabaseAdmin
//       .from("cases")
//       .select("id")
//       .eq("idd_secure_link_token", token)
//       .single();
//     if (caseError) {
//       throw new Error("Invalid or expired submission link.");
//     }

//     // Insert the client's message
//     const { data, error } = await supabaseAdmin
//       .from("communication_log")
//       .insert({
//         case_id: caseData.id,
//         message_text: message_text,
//         sender_type: "client", // Mark this message as from the client
//       })
//       .select()
//       .single();

//     if (error) {
//       throw error;
//     }
//     res.status(201).json(data);
//   } catch (error) {
//     console.error("Error posting client message:", error);
//     res
//       .status(500)
//       .json({ message: "Failed to post message.", error: error.message });
//   }
// });

// This endpoint allows a firm to request changes to a submitted IDD
app.post(
  "/api/cases/:caseId/request-changes",
  authenticateToken,
  async (req, res) => {
    const { caseId } = req.params;
    const { comments } = req.body; // The comments from the firm
    const firmUserId = req.user.sub;

    if (!comments) {
      return res
        .status(400)
        .json({ message: "Comments are required to request changes." });
    }

    try {
      // 1. Security check: Make sure the user owns the case
      const { data: caseData, error: ownerError } = await supabaseAdmin
        .from("cases")
        .select("id")
        .eq("id", caseId)
        .eq("firm_user_id", firmUserId)
        .single();
      if (ownerError) {
        throw new Error("Case not found or permission denied.");
      }

      // 2. Update the case status back to 'Awaiting Client IDD'
      const { error: caseUpdateError } = await supabaseAdmin
        .from("cases")
        .update({ status: "Awaiting Client IDD" })
        .eq("id", caseId);
      if (caseUpdateError) {
        throw caseUpdateError;
      }

      // 3. Update the invention disclosure: add comments and "re-open" the form by clearing the submission date
      const { data, error: disclosureUpdateError } = await supabaseAdmin
        .from("invention_disclosures")
        .update({
          firm_comments: comments,
          submitted_at: null, // This re-opens the form for the client
        })
        .eq("case_id", caseId)
        .select()
        .single();

      if (disclosureUpdateError) {
        throw disclosureUpdateError;
      }

      res.status(200).json({
        message: "Changes requested successfully.",
        updatedCase: data,
      });
    } catch (error) {
      console.error("Error requesting changes:", error);
      res
        .status(500)
        .json({ message: "Failed to request changes.", error: error.message });
    }
  }
);

// This route lets a firm user share a document with the client
app.patch(
  "/api/documents/:docId/share",
  authenticateToken,
  async (req, res) => {
    const { docId } = req.params;
    const firmUserId = req.user.sub;

    try {
      // Security check: Ensure the firm user owns the case this document belongs to.
      const { error: ownerError } = await supabaseAdmin
        .from("case_documents")
        .select("cases!inner(firm_user_id)")
        .eq("id", docId)
        .eq("cases.firm_user_id", firmUserId)
        .single();
      if (ownerError) {
        throw new Error("Document not found or permission denied.");
      }

      // Update the document to be shared
      const { data, error } = await supabaseAdmin
        .from("case_documents")
        .update({ is_shared: true, client_review_status: "pending" })
        .eq("id", docId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // --- THIS IS THE NEW, CRITICAL STEP ---
      // Also update the parent case's status to reflect this new phase
      const { error: caseUpdateError } = await supabaseAdmin
        .from("cases")
        .update({ status: "Awaiting Client Approval" })
        .eq("id", data.case_id);
      if (caseUpdateError) {
        throw caseUpdateError;
      }
      // --- END OF NEW STEP ---

      res.json(data);
    } catch (error) {
      console.error("Error sharing document:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// This route lets the client submit their review of a shared document
app.patch("/api/idd/:token/documents/:docId/review", async (req, res) => {
  const { token, docId } = req.params;
  const { status, comments } = req.body;

  if (!status || !["approved", "changes_requested"].includes(status)) {
    return res.status(400).json({ message: "A valid status is required." });
  }

  try {
    // Security check: Ensure the token is valid and matches the document's case
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from("cases")
      .select("id")
      .eq("idd_secure_link_token", token)
      .single();
    if (caseError) {
      throw new Error("Invalid or expired link.");
    }

    // Update the document review status
    const { data, error } = await supabaseAdmin
      .from("case_documents")
      .update({ client_review_status: status, client_comments: comments })
      .eq("id", docId)
      .eq("case_id", caseData.id) // Final security check
      .select()
      .single();

    if (error) {
      throw error;
    }

    // --- THIS IS THE NEW, CRITICAL STEP ---
    // If the client requested changes, update the main case status so the firm can see it
    if (status === "changes_requested") {
      const { error: caseUpdateError } = await supabaseAdmin
        .from("cases")
        .update({ status: "Client Changes Requested" }) // A new, clear status
        .eq("id", caseData.id);

      if (caseUpdateError) {
        throw caseUpdateError;
      }
    }
    if (status === "approved") {
      const { error: caseUpdateError } = await supabaseAdmin
        .from("cases")
        .update({ status: "Client Approved" }) // A final status
        .eq("id", caseData.id);

      if (caseUpdateError) {
        throw caseUpdateError;
      }
    }
    // --- END OF NEW STEP ---

    res.json(data);
  } catch (error) {
    console.error("Error submitting client review:", error);
    res.status(500).json({ message: error.message });
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
