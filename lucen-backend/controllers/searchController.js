const supabaseAdmin = require("../config/supabaseClient");
const { OpenAI } = require("openai");
const { getJson } = require("serpapi");
require("dotenv").config();
const { decryptData } = require("../utils/encryption");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.extractKeywords = async (req, res) => {
  const { caseId } = req.params;
  const firmUserId = req.user.sub;

  try {
    // 1. Security Check: Make sure the user owns the case
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .eq("firm_user_id", firmUserId)
      .single();
    if (caseError) {
      throw new Error("Case not found or permission denied.");
    }

    // 2. Fetch the invention disclosure data for this case
    const { data: disclosureData, error: disclosureError } = await supabaseAdmin
      .from("invention_disclosures")
      .select("data")
      .eq("case_id", caseId)
      .single();
    if (disclosureError) {
      throw new Error("Invention disclosure not found for this case.");
    }

    // --- THIS IS THE FIX ---
    // Decrypt the data before using it
    const idd = decryptData(disclosureData.data);
    if (!idd) {
      throw new Error(
        "Failed to decrypt invention data for keyword extraction."
      );
    }
    // --- END OF FIX ---

    // 3. Prepare the text content for the AI prompt
    const textForAI = `
      Title: ${idd.inventionTitle}
      Background: ${idd.background}
      Detailed Description: ${idd.detailedDescription}
      Novelty: ${idd.novelty}
    `;

    // 4. Create the prompt for the AI
    //   const prompt = `
    //   Based on the following invention disclosure text, extract a list of 5 to 10 relevant and specific technical keywords or short phrases suitable for a patent prior art search. Return the keywords as a single, comma-separated string.

    //   Invention Text:
    //   """
    //   ${textForAI}
    //   """

    //   Keywords:
    // `;
    const prompt = `
  You are an expert patent keyword extractor. Your task is to analyze the following invention disclosure text and extract the most relevant technical keywords.

  **Instructions:**
  - Identify 5 to 10 specific keywords or short technical phrases.
  - Return ONLY the keywords as a single, comma-separated string.
  - DO NOT include any introductory text, explanations, or conversational phrases like "Here are the keywords:".
  - Your entire response must only be the comma-separated list.

  **Invention Text:**
  """
  ${textForAI}
  """

  **Output:**
`;

    // 5. Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3, // Lower temperature for more focused output
      max_tokens: 100,
    });

    const keywordsString = response.choices[0].message.content.trim();

    // 6. Send the keywords back to the frontend
    res.json({ keywords: keywordsString });
  } catch (error) {
    console.error("Error extracting keywords:", error);
    res
      .status(500)
      .json({ message: "Failed to extract keywords.", error: error.message });
  }
};

exports.searchWithKeywords = async (req, res) => {
  const { caseId } = req.params;
  const { keywords } = req.body;

  // Log the incoming data so we can see what the frontend is sending
  console.log("--- Received Search Request ---");
  console.log("Keywords received:", keywords);

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    console.log("Validation failed: Keywords are missing or not an array.");
    return res.status(400).json({ message: "Keywords are required." });
  }

  const searchQuery = keywords.join(" ");
  console.log(`Formatted search query for SerpApi: "${searchQuery}"`);

  try {
    console.log("Calling SerpApi...");
    const json = await getJson({
      engine: "google_patents",
      q: searchQuery,
      api_key: process.env.SERPAPI_API_KEY,
    });

    // This will only run if the SerpApi call is successful
    console.log("SerpApi call successful. Sending results to frontend.");
    const searchResults = json.organic_results || []; // Use empty array as a fallback
    console.log(searchResults);
    // --- NEW LOGIC: Save the search to the database ---
    const { error: saveError } = await supabaseAdmin
      .from("prior_art_searches")
      .insert({
        case_id: caseId,
        keywords: keywords, // The array of keywords from the request
        results: searchResults, // The array of results from SerpApi
      });

    if (saveError) {
      // If saving fails, we log it but still send the results back to the user
      console.error("Error saving search results:", saveError);
    }
    // --- END OF NEW LOGIC ---

    res.json(searchResults);
  } catch (error) {
    // This will run if the SerpApi call throws a catchable error
    console.error("!!! ERROR in SerpApi try...catch block:", error);
    res.status(500).json({
      message: "Failed to perform patent search.",
      error: error.message,
    });
  }
};
