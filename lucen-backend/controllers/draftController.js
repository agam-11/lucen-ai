const supabaseAdmin = require("../config/supabaseClient");
const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.generateDraftSection = async (req, res) => {
  const { caseId } = req.params;
  const firmUserId = req.user.sub;
  // Get the section type and instructions from the frontend request
  const { sectionType, attorneyInstructions } = req.body;

  if (!sectionType) {
    return res.status(400).json({ message: "Section type is required." });
  }

  try {
    // 1. Security Check & Fetch IDD to get the context for our prompt
    const { data: disclosureData, error: disclosureError } = await supabaseAdmin
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

    res.json({ draftText: draftData.content_edited || "" });
  } catch (error) {
    console.error("Error fetching draft section:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch draft.", error: error.message });
  }
};
