const supabaseAdmin = require("../config/supabaseClient");
const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const { encryptData } = require("../utils/encryption");
const { decryptData } = require("../utils/encryption");

// Replace the entire generateDraftSection function in draftController.js

// Add this new function to lucen-backend/controllers/draftController.js
// Add this new function to lucen-backend/controllers/draftController.js
exports.createNamedVersion = async (req, res) => {
  const { caseId } = req.params;
  const { versionName } = req.body;
  const firmUserId = req.user.sub;

  if (!versionName) {
    return res.status(400).json({ message: "A version name is required." });
  }

  try {
    // Security check to ensure user owns the case
    const { error: ownerError } = await supabaseAdmin
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .eq("firm_user_id", firmUserId)
      .single();
    if (ownerError) {
      throw new Error("Permission denied.");
    }

    // Find the most recent version for this case
    const { data: latestVersion, error: fetchError } = await supabaseAdmin
      .from("draft_versions")
      .select("id")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      throw new Error("No draft found to save as a milestone.");
    }

    // Update that most recent version to be a milestone
    const { data: milestone, error: updateError } = await supabaseAdmin
      .from("draft_versions")
      .update({
        version_name: versionName,
        is_milestone: true,
      })
      .eq("id", latestVersion.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res
      .status(200)
      .json({ message: "Milestone created successfully.", data: milestone });
  } catch (error) {
    console.error("Error creating milestone:", error);
    res.status(500).json({ message: "Failed to create milestone." });
  }
};

// Add this new function to lucen-backend/controllers/draftController.js
exports.getDraftHistory = async (req, res) => {
  const { caseId } = req.params;
  const firmUserId = req.user.sub;

  try {
    // Security check to ensure user owns the case
    const { error: ownerError } = await supabaseAdmin
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .eq("firm_user_id", firmUserId)
      .single();
    if (ownerError) {
      throw new Error("Permission denied.");
    }

    // Fetch all versions for this case, newest first
    const { data, error } = await supabaseAdmin
      .from("draft_versions")
      .select("id, created_at, version_name, is_milestone") // We don't need the full content for the list
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching draft history:", error);
    res.status(500).json({ message: "Failed to fetch history." });
  }
};

// Add these two new functions to lucen-backend/controllers/draftController.js

// This gets the full content of a single, specific version
exports.getDraftVersionContent = async (req, res) => {
  const { versionId } = req.params;
  const firmUserId = req.user.sub;

  try {
    // Security check to make sure the user owns the case this version belongs to
    const { data, error } = await supabaseAdmin
      .from("draft_versions")
      .select("full_content, cases!inner(firm_user_id)")
      .eq("id", versionId)
      .eq("cases.firm_user_id", firmUserId)
      .single();

    if (error) {
      throw new Error("Version not found or permission denied.");
    }

    res.json({ fullContent: data.full_content });
  } catch (error) {
    console.error("Error fetching version content:", error);
    res.status(500).json({ message: "Failed to fetch version content." });
  }
};

// This is the new "Smart" Auto-Save. It's now a transaction.
exports.autoSaveVersion = async (req, res) => {
  const { caseId } = req.params;
  const { fullContent } = req.body;
  const firmUserId = req.user.sub;

  try {
    // We use a database transaction to ensure both steps succeed or neither do.
    const { data, error } = await supabaseAdmin.rpc(
      "handle_new_draft_version",
      {
        target_case_id: caseId,
        firm_user_id_check: firmUserId,
        new_content: fullContent,
      }
    );

    if (error) throw error;
    res.status(200).json({ message: "Auto-saved successfully." });
  } catch (error) {
    console.error("Error auto-saving draft:", error);
    res.status(500).json({ message: "Failed to auto-save." });
  }
};

// This function now simply gets the one "latest" version.
exports.getLatestDraft = async (req, res) => {
  const { caseId } = req.params;
  const firmUserId = req.user.sub;
  try {
    const { data, error } = await supabaseAdmin
      .from("draft_versions")
      .select("full_content")
      .eq("case_id", caseId)
      .eq("is_latest", true) // <-- The new, reliable logic
      .maybeSingle(); // Use maybeSingle to return null instead of error if not found

    if (error) throw error;
    res.status(200).json({ fullContent: data?.full_content || "" });
  } catch (error) {
    console.error("Error fetching latest draft:", error);
    res.status(500).json({ message: "Failed to fetch latest draft." });
  }
};

// This function now correctly restores a version by updating the 'is_latest' flags.
exports.restoreVersion = async (req, res) => {
  const { versionId } = req.params;
  const firmUserId = req.user.sub;
  try {
    const { data, error } = await supabaseAdmin.rpc("restore_draft_version", {
      target_version_id: versionId,
      firm_user_id_check: firmUserId,
    });
    if (error) throw error;
    res.status(200).json({ message: "Version restored successfully." });
  } catch (error) {
    console.error("Error restoring version:", error);
    res.status(500).json({ message: "Failed to restore version." });
  }
};
