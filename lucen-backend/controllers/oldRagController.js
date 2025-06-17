// lucen-backend/controllers/ragController.js
const { OpenAI } = require("openai");
const supabaseAdmin = require("../config/supabaseClient");
const { decryptData } = require("../utils/encryption");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple function to break text into overlapping chunks
function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

// Main function to build the memory for a case
exports.buildMemoryForCase = async (req, res) => {
  const { caseId } = req.params;
  const firmUserId = req.user.sub;

  try {
    // Security check and fetch all necessary data
    const { data: caseData, error } = await supabaseAdmin
      .from("cases")
      .select(
        "invention_disclosures(data), ai_prior_art_analysis(analysis_summary)"
      )
      .eq("id", caseId)
      .eq("firm_user_id", firmUserId)
      .eq("ai_prior_art_analysis.review_status", "relevant")
      .single();
    if (error) throw new Error("Case data not found or permission denied.");

    const idd = decryptData(caseData.invention_disclosures.data);
    console.log(idd);
    const priorArtSummaries = (caseData.ai_prior_art_analysis || [])
      .map((a) => a.analysis_summary)
      .join("\n\n");
    const fullText = `IDD Title: ${idd.inventionTitle}\n\nIDD Description: ${idd.detailedDescription}\n\nPrior Art Context:\n${priorArtSummaries}`;

    const textChunks = chunkText(fullText);

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: textChunks,
    });

    const chunksToInsert = embeddingResponse.data.map((embeddingObj, i) => ({
      case_id: caseId,
      content: textChunks[i],
      embedding: embeddingObj.embedding,
    }));

    await supabaseAdmin.from("document_chunks").insert(chunksToInsert);

    // --- THIS IS THE NEW STEP ---
    // After successfully building the memory, update the case status
    const { error: updateError } = await supabaseAdmin
      .from("cases")
      .update({ status: "Drafting Ready" })
      .eq("id", caseId);

    if (updateError) {
      // This is not a critical failure, so just log it
      console.error(
        "Error updating case status to Drafting Ready:",
        updateError
      );
    }
    // --- END OF NEW STEP ---

    res.status(200).json({ message: "AI memory built successfully." });
  } catch (error) {
    console.error("Error building RAG pipeline:", error);
    res.status(500).json({ message: "Failed to build AI memory." });
  }
};
