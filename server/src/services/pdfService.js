const pdfParse = require("pdf-parse");

async function extractPdfText(buffer) {
  const data = await pdfParse(buffer);
  const text = data.text.trim();

  if (!text) {
    throw new Error("No selectable text was found in this PDF.");
  }

  return {
    text,
    pageCount: data.numpages
  };
}

module.exports = { extractPdfText };