const supabaseAdmin = require("../config/supabaseClient");
const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.analyzePriorArt = async (req, res) => {
  const { caseId } = req.params;
  const firmUserId = req.user.sub;
  const { priorArtDocument } = req.body; // The search result object sent from the frontend

  if (!priorArtDocument) {
    return res.status(400).json({ message: "Prior art document is required." });
  }

  try {
    // 1. Security Check & Fetch IDD using an inner join to verify ownership
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
    const { data: savedAnalysis, error: saveError } = await supabaseAdmin
      .from("ai_prior_art_analysis")
      .insert({
        case_id: caseId,
        prior_art_document: priorArtDocument, // Save the original document for reference
        analysis_summary: analysisJson.summary,
        similarities: analysisJson.similarities,
        differences: analysisJson.differences,
        similarity_score: analysisJson.similarityScore,
      })
      .select()
      .single();

    if (saveError) {
      // If saving fails, we log it but proceed, as the user still got the analysis.
      console.error("Error saving AI analysis:", saveError);
    }
    // --- END OF NEW STEP ---

    res.json(savedAnalysis);
  } catch (error) {
    console.error("Error analyzing prior art:", error);
    res.status(500).json({
      message: "Failed to analyze prior art.",
      error: error.message,
    });
  }
};

exports.updateAnalysisStatus = async (req, res) => {
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

    if (ownerError) throw new Error("Analysis not found or permission denied.");

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
};
