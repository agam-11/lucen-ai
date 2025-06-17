const supabaseAdmin = require("../config/supabaseClient");
const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const { encryptData } = require("../utils/encryption");
const { decryptData } = require("../utils/encryption");

// Replace the entire generateDraftSection function in draftController.js
exports.generateDraftSection = async (req, res) => {
  const { caseId } = req.params;
  const firmUserId = req.user.sub;
  const { sectionType, attorneyInstructions } = req.body;

  if (!sectionType) {
    return res.status(400).json({ message: "Section type is required." });
  }

  try {
    // --- THIS IS THE NEW, SMARTER LOGIC ---

    // 1. Fetch the IDD AND all prior art analyses marked as 'relevant'
    // We use a more advanced query to get linked data.
    // 1. Security Check & Fetch IDD (First, separate query)
    const { data: disclosureData, error: disclosureError } = await supabaseAdmin
      .from("invention_disclosures")
      .select("data, cases!inner(firm_user_id)")
      .eq("case_id", caseId)
      .eq("cases.firm_user_id", firmUserId)
      .single();

    if (disclosureError) {
      throw new Error("Invention disclosure not found or permission denied.");
    }

    // 2. Fetch all prior art analyses marked as 'relevant' (Second, separate query)
    const { data: relevantAnalyses, error: analysesError } = await supabaseAdmin
      .from("ai_prior_art_analysis")
      .select("analysis_summary")
      .eq("case_id", caseId)
      .eq("review_status", "relevant");

    if (analysesError) {
      // It's okay if this fails, we just won't have prior art context
      console.error(
        "Could not fetch relevant analyses:",
        analysesError.message
      );
    }

    // 2. Prepare the context for the AI
    const idd = decryptData(disclosureData.data);
    if (!idd) {
      throw new Error("Failed to decrypt invention data.");
    }

    const inventionText = `Title: ${idd.inventionTitle}. Description: ${idd.detailedDescription}. Novelty: ${idd.novelty}`;

    // Format the relevant prior art summaries into a clean list
    const relevantPriorArtSummaries = (relevantAnalyses || [])
      .map((analysis, index) => `${index + 1}. ${analysis.analysis_summary}`)
      .join("\n");

    // 3. Develop specific, context-aware prompts
    let specificInstruction = "";
    switch (sectionType) {
      case "Background":
        specificInstruction = `Draft a 'Background of the Invention' section. First, introduce the general field from the Invention Disclosure. Then, you MUST discuss the problems with existing solutions by referencing the provided Prior Art Summaries. Conclude by explaining the need for an improved solution.`;
        break;
      case "Summary":
        specificInstruction = `Draft a 'Summary of the Invention' section. Provide a broad overview of the invention from the Invention Disclosure, and briefly contrast it with the key concepts mentioned in the Prior Art Summaries to highlight its advantages.`;
        break;
      default:
        return res.status(400).json({ message: "Invalid section type." });
    }

    // 4. Create the final, powerful prompt
    const prompt = `
            You are an expert patent drafter. Your task is to draft a section of a patent application. You must synthesize information from both the invention disclosure and the provided prior art.

            **Section to Draft:** ${sectionType}
            **Your main instruction:** ${specificInstruction}
            **Additional instructions from the attorney:** "${
              attorneyInstructions || "None"
            }"

            **Invention Disclosure Context:**
            """
            ${inventionText}
            """

            **Relevant Prior Art Summaries to Discuss:**
            """
            ${relevantPriorArtSummaries || "No specific prior art provided."}
            """

            Draft the requested section below:
        `;

    // 5. Call the AI (unchanged)
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 800,
    });

    const draftText = response.choices[0].message.content.trim();
    res.json({ draftText: draftText });
  } catch (error) {
    console.error("Error drafting section:", error);
    res
      .status(500)
      .json({ message: "Failed to draft section.", error: error.message });
  }
};

exports.saveDraftSection = async (req, res) => {
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
    const encryptedDraft = encryptData(draftText);

    // Now, upsert the draft content
    const { data, error: upsertError } = await supabaseAdmin
      .from("ai_drafted_sections")
      .upsert(
        {
          case_id: caseId,
          section_type: sectionType,
          content_edited: encryptedDraft,
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
};

exports.getDraftSection = async (req, res) => {
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

    const decryptedDraftData = decryptData(draftData.content_edited);

    res.json({ draftText: decryptedDraftData || "" });
  } catch (error) {
    console.error("Error fetching draft section:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch draft.", error: error.message });
  }
};

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

// autoSaveVersion = async (req, res) => {
//   const { caseId } = req.params;
//   const { fullContent } = req.body;
//   const firmUserId = req.user.sub;

//   try {
//     // Security check to ensure user owns the case
//     const { error: ownerError } = await supabaseAdmin
//       .from("cases")
//       .select("id")
//       .eq("id", caseId)
//       .eq("firm_user_id", firmUserId)
//       .single();
//     if (ownerError) {
//       throw new Error("Permission denied.");
//     }

//     // --- THIS IS THE SMART LOGIC ---
//     // 1. Get the most recent version for this case.
//     const { data: latestVersion, error: fetchError } = await supabaseAdmin
//       .from("draft_versions")
//       .select("id, created_at, is_milestone")
//       .eq("case_id", caseId)
//       .order("created_at", { ascending: false })
//       .limit(1)
//       .single();

//     if (fetchError && fetchError.code !== "PGRST116") {
//       // Ignore "no rows found" error
//       throw fetchError;
//     }

//     const now = new Date();
//     const fiveMinutes = 5 * 60 * 1000;

//     // 2. Decide whether to UPDATE the last version or INSERT a new one.
//     if (
//       latestVersion &&
//       !latestVersion.is_milestone &&
//       now - new Date(latestVersion.created_at) < fiveMinutes
//     ) {
//       // If the last save was recent and not a milestone, UPDATE it.
//       await supabaseAdmin
//         .from("draft_versions")
//         .update({ full_content: fullContent })
//         .eq("id", latestVersion.id);
//     } else {
//       // Otherwise, INSERT a new version.
//       await supabaseAdmin
//         .from("draft_versions")
//         .insert({ case_id: caseId, full_content: fullContent });
//     }
//     // --- END OF SMART LOGIC ---

//     res.status(200).json({ message: "Auto-saved successfully." });
//   } catch (error) {
//     console.error("Error auto-saving draft:", error);
//     res.status(500).json({ message: "Failed to auto-save." });
//   }
// };

// This restores an old version by creating a new version from it
// exports.restoreVersion = async (req, res) => {
//   const { versionId } = req.params;
//   const firmUserId = req.user.sub;

//   try {
//     // 1. Get the content of the old version we want to restore (and check ownership)
//     const { data: oldVersion, error: fetchError } = await supabaseAdmin
//       .from("draft_versions")
//       .select("case_id, full_content, cases!inner(firm_user_id)")
//       .eq("id", versionId)
//       .eq("cases.firm_user_id", firmUserId)
//       .single();

//     if (fetchError) {
//       throw new Error("Version to restore not found or permission denied.");
//     }

//     // 2. Insert a brand new version using the old content
//     const { data: newVersion, error: insertError } = await supabaseAdmin
//       .from("draft_versions")
//       .insert({
//         case_id: oldVersion.case_id,
//         full_content: oldVersion.full_content,
//         // We can give it a special name to mark it as restored
//         version_name: `Restored from version created at ${new Date(
//           oldVersion.created_at
//         ).toLocaleString()}`,
//         is_milestone: true,
//       })
//       .select()
//       .single();

//     if (insertError) {
//       throw insertError;
//     }

//     res
//       .status(200)
//       .json({ message: "Version restored successfully.", newVersion });
//   } catch (error) {
//     console.error("Error restoring version:", error);
//     res.status(500).json({ message: "Failed to restore version." });
//   }
// };

// // Add this new function to lucen-backend/controllers/draftController.js
// exports.getLatestDraft = async (req, res) => {
//   const { caseId } = req.params;
//   const firmUserId = req.user.sub;

//   try {
//     // Security check to ensure user owns the case
//     const { error: ownerError } = await supabaseAdmin
//       .from("cases")
//       .select("id")
//       .eq("id", caseId)
//       .eq("firm_user_id", firmUserId)
//       .single();
//     if (ownerError) {
//       throw new Error("Permission denied.");
//     }

//     // Fetch the single most recent version for this case
//     const { data, error } = await supabaseAdmin
//       .from("draft_versions")
//       .select("full_content")
//       .eq("case_id", caseId)
//       .order("created_at", { ascending: false })
//       .limit(1)
//       .single();

//     // It's okay if no draft is found (error code PGRST116), just return empty
//     if (error && error.code !== "PGRST116") {
//       throw error;
//     }

//     res.status(200).json({ fullContent: data?.full_content || "" });
//   } catch (error) {
//     console.error("Error fetching latest draft:", error);
//     res.status(500).json({ message: "Failed to fetch latest draft." });
//   }
// };

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
