const express = require("express");
const { embedText } = require("../services/embeddingService");
const { searchChunks } = require("../services/vectorStoreService");

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { question, documentId, limit } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: "A question is required." });
    }

    const questionEmbedding = await embedText(question, "RETRIEVAL_QUERY");
    const results = await searchChunks(questionEmbedding, { documentId, limit });

    res.json({ question, resultCount: results.length, results });
  } catch (error) {
    next(error);
  }
});

module.exports = router;