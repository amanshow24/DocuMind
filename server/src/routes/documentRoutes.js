const express = require("express");
const multer = require("multer");
const { extractPdfText } = require("../services/pdfService");
const { chunkText } = require("../services/chunkingService");
const { embedChunks } = require("../services/embeddingService");
const { storeChunks } = require("../services/vectorStoreService");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (file.mimetype !== "application/pdf") {
      return callback(new Error("Only PDF files are supported."));
    }

    callback(null, true);
  }
});

router.post("/extract", upload.single("document"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Upload a PDF in the document field." });
    }

    const result = await extractPdfText(req.file.buffer);

    res.json({
      fileName: req.file.originalname,
      pageCount: result.pageCount,
      characterCount: result.text.length,
      text: result.text
    });
  } catch (error) {
    next(error);
  }
});

router.post("/chunk", upload.single("document"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Upload a PDF in the document field." });
    }

    const extractedDocument = await extractPdfText(req.file.buffer);
    const documentId = req.file.originalname.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
    const chunks = chunkText(extractedDocument.text, { documentId });

    res.json({
      fileName: req.file.originalname,
      documentId,
      pageCount: extractedDocument.pageCount,
      chunkCount: chunks.length,
      chunks
    });
  } catch (error) {
    next(error);
  }
});

router.post("/embed", upload.single("document"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Upload a PDF in the document field." });
    }

    const extractedDocument = await extractPdfText(req.file.buffer);
    const documentId = req.file.originalname.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
    const chunks = chunkText(extractedDocument.text, { documentId });
    const embeddedChunks = await embedChunks(chunks);

    res.json({
      fileName: req.file.originalname,
      pageCount: extractedDocument.pageCount,
      chunkCount: embeddedChunks.length,
      embeddingDimensions: embeddedChunks[0]?.embedding.length || 0,
      chunks: embeddedChunks.map((chunk) => ({
        id: chunk.id,
        text: chunk.text,
        metadata: chunk.metadata,
        embeddingPreview: chunk.embedding.slice(0, 5)
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.post("/store", upload.single("document"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Upload a PDF in the document field." });
    }

    const extractedDocument = await extractPdfText(req.file.buffer);
    const documentId = req.file.originalname.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
    const chunks = chunkText(extractedDocument.text, { documentId });
    const embeddedChunks = await embedChunks(chunks);
    const storageResult = await storeChunks(embeddedChunks);

    res.json({
      fileName: req.file.originalname,
      documentId,
      pageCount: extractedDocument.pageCount,
      ...storageResult
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;