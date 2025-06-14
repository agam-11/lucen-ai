const supabaseAdmin = require("../config/supabaseClient");
const { v4: uuidv4 } = require("uuid"); // Import uuid
require("dotenv").config();
const { decryptData } = require("../utils/encryption");

exports.createNewCase = async (req, res) => {
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
};

exports.getAllCases = async (req, res) => {
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
};

exports.getCaseDetails = async (req, res) => {
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

    let finalDisclosure = null;
    if (disclosure && disclosure.data) {
      const decryptedData = decryptData(disclosure.data);
      finalDisclosure = { ...disclosure, data: decryptedData };
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
      invention_disclosure: finalDisclosure, // Nested disclosure object
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
};

exports.uploadManualPriorArt = async (req, res) => {
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
};

exports.requestChanges = async (req, res) => {
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
};
