require("dotenv").config();

const cors = require("cors");
const express = require("express");
const documentRoutes = require("./routes/documentRoutes");
const searchRoutes = require("./routes/searchRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/documents", documentRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/chat", chatRoutes);

app.use((error, req, res, next) => {
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "The PDF must be 10 MB or smaller." });
  }

  if (error.message === "Only PDF files are supported.") {
    return res.status(400).json({ error: error.message });
  }

  const errorText = `${error?.message || ""} ${error?.status || ""}`;

  if (error?.status === "RESOURCE_EXHAUSTED" || errorText.includes("429") || errorText.includes("QUOTA_EXCEEDED")) {
    return res.status(429).json({
      error: "Gemini's free-tier quota has been reached. Please wait for the quota to reset or use another Gemini project."
    });
  }

  if (error?.status === "UNAVAILABLE" || errorText.includes("503") || errorText.includes("high demand")) {
    return res.status(503).json({ error: "Gemini is temporarily busy. Please try again in a moment." });
  }

  console.error(error);
  res.status(500).json({
    error: process.env.NODE_ENV === "production"
      ? "Something went wrong while processing the request."
      : error.message
  });
});

app.listen(port, () => {
  console.log(`DocuMind server is running at http://localhost:${port}`);
});