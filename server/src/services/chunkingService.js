function chunkText(text, options = {}) {
  const {
    documentId = "document",
    maxCharacters = 1000,
    overlapCharacters = 150
  } = options;

  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Text is required for chunking.");
  }

  if (!Number.isInteger(maxCharacters) || maxCharacters <= 0) {
    throw new Error("maxCharacters must be a positive integer.");
  }

  if (!Number.isInteger(overlapCharacters) || overlapCharacters < 0 || overlapCharacters >= maxCharacters) {
    throw new Error("overlapCharacters must be at least 0 and smaller than maxCharacters.");
  }

  const words = text.trim().replace(/\s+/g, " ").split(" ");
  const chunks = [];
  let wordIndex = 0;

  while (wordIndex < words.length) {
    const chunkWords = [];
    let chunkLength = 0;

    while (wordIndex + chunkWords.length < words.length) {
      const nextWord = words[wordIndex + chunkWords.length];
      const nextLength = chunkLength === 0 ? nextWord.length : chunkLength + 1 + nextWord.length;

      if (chunkWords.length > 0 && nextLength > maxCharacters) {
        break;
      }

      chunkWords.push(nextWord);
      chunkLength = nextLength;

      if (nextWord.length > maxCharacters) {
        break;
      }
    }

    const chunkTextValue = chunkWords.join(" ");
    const chunkIndex = chunks.length;

    chunks.push({
      id: `${documentId}-chunk-${chunkIndex + 1}`,
      text: chunkTextValue,
      metadata: {
        documentId,
        chunkIndex,
        characterCount: chunkTextValue.length
      }
    });

    if (wordIndex + chunkWords.length >= words.length) {
      break;
    }

    let overlapLength = 0;
    let overlapWordCount = 0;

    for (let index = chunkWords.length - 1; index >= 0; index -= 1) {
      const wordLength = chunkWords[index].length;
      const nextLength = overlapWordCount === 0 ? wordLength : overlapLength + 1 + wordLength;

      if (nextLength > overlapCharacters) {
        break;
      }

      overlapLength = nextLength;
      overlapWordCount += 1;
    }

    wordIndex += Math.max(1, chunkWords.length - overlapWordCount);
  }

  return chunks;
}

module.exports = { chunkText };