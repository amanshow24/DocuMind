const { GoogleGenAI } = require("@google/genai");

const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const embeddingDimensions = Number(process.env.GEMINI_EMBEDDING_DIMENSIONS || 768);

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

function normalizeEmbedding(values) {
  const length = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));

  if (length === 0) {
    throw new Error("Gemini returned an empty embedding vector.");
  }

  return values.map((value) => value / length);
}

async function embedText(text, taskType = "RETRIEVAL_DOCUMENT") {
  if (!text || !text.trim()) {
    throw new Error("Text is required for embedding.");
  }

  const client = getGeminiClient();
  const result = await client.models.embedContent({
    model: embeddingModel,
    contents: text,
    config: {
      taskType,
      outputDimensionality: embeddingDimensions
    }
  });

  const values = result.embeddings?.[0]?.values;

  if (!values?.length) {
    throw new Error("Gemini did not return an embedding vector.");
  }

  return normalizeEmbedding(values);
}

async function embedChunks(chunks) {
  const embeddedChunks = [];

  for (const chunk of chunks) {
    const embedding = await embedText(chunk.text);
    embeddedChunks.push({ ...chunk, embedding });
  }

  return embeddedChunks;
}

module.exports = { embedText, embedChunks };