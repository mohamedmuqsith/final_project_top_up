import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENV } from '../config/env.js';

let aiInstance = null;
if (ENV.GEMINI_API_KEY) {
  aiInstance = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
}

/**
 * Sends candidate products and context to Gemini for smart ranking.
 * Returns exactly an array of IDs and Reasons, or null if it fails.
 */
export const rankProductsWithGemini = async (context, candidates, type = "similar") => {
  if (!aiInstance) {
    console.warn("[Gemini] GEMINI_API_KEY is not set. Using fallback ranking.");
    return null; /* triggers controller fallback */
  }

  // Optimize token usage by trimming candidate fields
  const candidateSummary = candidates.map(c => ({
    id: c._id, 
    name: c.name, 
    category: c.category, 
    price: c.price, 
    rating: c.averageRating 
  }));

  const prompt = `
You are a product recommendation engine for an electronics e-commerce store.
Your goal is to select the top 5 BEST product recommendations from the provided "candidates" list, based on the provided "context".

Context (${type === "similar" ? "Target Product Viewed" : "User Preferences/History"}):
${JSON.stringify(context, null, 2)}

Candidate Products to Choose From:
${JSON.stringify(candidateSummary, null, 2)}

Instructions:
1. Select exactly up to 5 best recommendations from the candidate list.
2. If there are fewer than 5 candidates, return all of them ordered by best match.
3. Your response must ONLY contain a valid JSON array.
4. Each object in the array must strictly follow this structure:
   {
     "id": "the _id from the candidate",
     "reason": "a short, 1-sentence explanation of why it was chosen"
   }
No markdown wrappers, no conversational text, strictly JSON array.
`;

  try {
    const model = aiInstance.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const parsedResponse = JSON.parse(text);
    if (!Array.isArray(parsedResponse)) throw new Error("Output was not a JSON array");
    return parsedResponse;
    
  } catch (error) {
    if (error.message?.includes("429") || error.message?.includes("quota")) {
      console.warn("[Gemini] Quota exceeded (429). Using rule-based fallback.");
    } else {
      console.error("[Gemini] API or Parsing Error:", error.message);
    }
    return null; // Signals controller to use rule-based fallback
  }
};
