// lucen-backend/controllers/commandController.js
const { OpenAI } = require("openai");
const supabaseAdmin = require("../config/supabaseClient");
const { decryptData } = require("../utils/encryption");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.handleAiCommand = async (req, res) => {
  const { caseId } = req.params;
  const { command, contextText } = req.body;

  try {
    // --- STEP 0: GATHER INITIAL CONTEXT ---
    // We get the high-level summary of the invention to inform our first AI call.
    const { data: disclosureData, error: disclosureError } = await supabaseAdmin
      .from("invention_disclosures")
      .select("data")
      .eq("case_id", caseId)
      .single();

    if (disclosureError) {
      throw new Error("Could not find invention disclosure for context.");
    }
    const idd = decryptData(disclosureData.data);
    console.log(idd);
    if (!idd) {
      throw new Error("Failed to decrypt invention data.");
    }
    const inventionSummary = `Title: ${idd.inventionTitle}. Key Novelty: ${idd.novelty}`;

    // --- STEP 1: HyDE - GENERATE A HYPOTHETICAL ANSWER ---
    // This first AI call creates the perfect "search query" for our vector database.
    // const hypotheticalAnswerPrompt = `
    //         A user has given the following command: "${command}".
    //         Their invention is about: "${inventionSummary}".
    //         The text immediately surrounding their cursor is: ${
    //           contextText || "No surrounding text."
    //         }

    //         To find the most relevant information in a database, generate a short, ideal paragraph that you would expect to be the perfect answer to the user's command.
    //         Focus on technical details and concepts.
    //     `;

    // Replace your hypotheticalAnswerPrompt with this new one

    const hypotheticalAnswerPrompt = `
    You are an expert at generating hypothetical answers to be used for semantic search.
    A user has given a command related to a patent application for an invention about: "${inventionSummary}".
    The text immediately surrounding their cursor is: "${
      contextText || "No surrounding text."
    }"

    Here is an example of a good hypothetical answer for a command:
    USER COMMAND: "//draft the background section"
    HYPOTHETICAL ANSWER: "The field of this invention pertains to beverage brewing devices. Prior art systems often use pre-ground coffee, which can lead to inconsistent flavor. For instance, some single-serve brewers use a piercing mechanism, but this does not address the issue of coffee freshness. A need therefore exists for a brewing appliance that incorporates an integrated grinding blade to provide a consistently fresh serving."

    Now, based on that example, generate a new hypothetical answer for the following command. The answer should be a dense, single paragraph containing key technical concepts.

    USER COMMAND: "${command}"
    HYPOTHETICAL ANSWER:
`;

    const hypotheticalAnswerResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: hypotheticalAnswerPrompt }],
      max_tokens: 150,
    });
    const hypotheticalAnswer =
      hypotheticalAnswerResponse.choices[0].message.content;

    console.log("-------------HYPOTHETICAL ANSWER---------------");
    console.log(hypotheticalAnswer);

    // --- STEP 2: VECTOR SEARCH - USE THE HYPOTHETICAL ANSWER TO FIND REAL CONTEXT ---
    // We turn the perfect answer into a vector to search our database.
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: hypotheticalAnswer,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search the database for the most similar real chunks of text.
    const { data: contextChunks, error: matchError } = await supabaseAdmin.rpc(
      "match_document_chunks",
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.5, // We can use a real threshold now that our search is smart
        match_count: 5,
        target_case_id: caseId,
      }
    );
    if (matchError) {
      throw matchError;
    }

    console.log("------------CONTEXT CHUNKS-------------------");
    console.log(contextChunks);

    const relevantContext = contextChunks
      .map((chunk) => chunk.content)
      .join("\n\n---\n\n");
    console.log("------------relevant CHUNKS-------------------");

    console.log(relevantContext);

    // --- STEP 3: FINAL GENERATION - ANSWER THE USER'S REAL COMMAND ---
    // Now we give the main AI the user's command AND the perfect context we just found.
    const finalPrompt = `
            You are an AI co-pilot for a patent attorney. Follow the user's command precisely, using the provided context. Generate only the text that should be inserted back into the document.

            **User's Command:**
            "${command}"

            **Most Relevant Context from Case Files:**
            """
            ${relevantContext || "No highly relevant context found."}
            """

            **Generated Text:**
        `;

    const finalResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: finalPrompt }],
    });

    res.json({ draftText: finalResponse.choices[0].message.content.trim() });
  } catch (error) {
    console.error("Error handling AI command:", error);
    res.status(500).json({ message: "Failed to execute AI command." });
  }
};
