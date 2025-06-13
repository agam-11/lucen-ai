const supabaseAdmin = require("../config/supabaseClient");
require("dotenv").config();

exports.shareDocument = async (req, res) => {
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
};
