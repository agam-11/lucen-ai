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
