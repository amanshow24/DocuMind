const express = require("express");
const { embedText } = require("../services/embeddingService");
const { searchChunks } = require("../services/vectorStoreService");
const { generateAnswer } = require("../services/generationService");

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { question, documentId, limit } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: "A question is required." });
    }

    const questionEmbedding = await embedText(question, "RETRIEVAL_QUERY");
    const results = await searchChunks(questionEmbedding, { documentId, limit });
    const answer = await generateAnswer(question, results);

    res.json({
      question,
      answer,
      sources: results.map((result) => ({
        id: result.id,
        metadata: result.metadata,
        distance: result.distance
      }))
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;