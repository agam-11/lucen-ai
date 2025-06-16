// lucen-backend/controllers/commandController.js
const { OpenAI } = require("openai");
const supabaseAdmin = require("../config/supabaseClient");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.handleAiCommand = async (req, res) => {
  const { caseId } = req.params;
  const { command, contextText } = req.body;
  console.log("hie pookie from handleAICommand");

  try {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: command + "\n" + contextText,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    const { data: contextChunks, error: matchError } = await supabaseAdmin.rpc(
      "match_document_chunks",
      {
        query_embedding: queryEmbedding,
        match_threshold: 0,
        match_count: 5,
        target_case_id: caseId,
      }
    );
    if (matchError) throw matchError;

    console.log("hi");
    console.log(contextChunks);
    const relevantContext = contextChunks
      .map((chunk) => chunk.content)
      .join("\n\n---\n\n");

    const masterPrompt = `
            You are an AI co-pilot for a patent attorney. Follow the user's command precisely, using the provided context. Generate only the text that should be inserted back into the document.

            **User's Command:**
            "${command}"

            **Most Relevant Context from Case Files:**
            """
            ${relevantContext}
            """

            **Generated Text:**
        `;

    const finalResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: masterPrompt }],
    });

    res.json({ draftText: finalResponse.choices[0].message.content.trim() });
  } catch (error) {
    console.error("Error handling AI command:", error);
    res.status(500).json({ message: "Failed to execute AI command." });
  }
};
