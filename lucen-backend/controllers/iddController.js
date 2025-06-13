const supabaseAdmin = require("../config/supabaseClient");
require("dotenv").config();

exports.getIddData = async (req, res) => {
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
    // console.log("--- LOG: Sending final response payload:", responsePayload);

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
};

exports.saveIddDraft = async (req, res) => {
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
};

exports.submitIdd = async (req, res) => {
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
};

exports.submitClientReview = async (req, res) => {
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
};
