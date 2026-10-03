const { GoogleGenAI } = require("@google/genai");

const generationModel = process.env.GEMINI_GENERATION_MODEL || "gemini-2.5-flash";
const fallbackAnswer = "I cannot find that in the document.";

function isTemporaryGeminiError(error) {
  const errorText = `${error?.message || ""} ${error?.status || ""}`;
  return error?.status === "UNAVAILABLE" || errorText.includes("503") || errorText.includes("high demand");
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function generateWithRetry(request) {
  const delays = [700, 1600];

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      if (!isTemporaryGeminiError(error) || attempt === delays.length) {
        throw error;
      }

      await wait(delays[attempt]);
    }
  }
}

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

function buildRagPrompt(question, results) {
  const context = results
    .map((result, index) => `[Source ${index + 1}]\n${result.text}`)
    .join("\n\n");

  return `You are DocuMind, a document question-answering assistant.

Answer the user's question using only the document context below.
Do not use outside knowledge or invent information.
If the answer is not clearly present in the context, reply exactly:
"${fallbackAnswer}"
Keep the answer clear and concise.

Document context:
${context}

User question:
${question}`;
}

async function generateAnswer(question, results) {
  if (!results.length) {
    return fallbackAnswer;
  }

  const client = getGeminiClient();
  let response;

  try {
    response = await generateWithRetry(() => client.models.generateContent({
      model: generationModel,
      contents: buildRagPrompt(question, results),
      config: {
        temperature: 0.2
      }
    }));
  } catch (error) {
    if (isTemporaryGeminiError(error)) {
      throw new Error("Gemini is temporarily busy. Please try again in a moment.");
    }

    throw error;
  }

  const answer = response.text?.trim();

  if (!answer) {
    throw new Error("Gemini did not return an answer.");
  }

  return answer;
}

module.exports = { buildRagPrompt, generateAnswer, fallbackAnswer };