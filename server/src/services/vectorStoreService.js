const { Pinecone } = require("@pinecone-database/pinecone");

const indexName = process.env.PINECONE_INDEX_NAME || "documind";
const indexHost = process.env.PINECONE_INDEX_HOST;
const namespaceName = process.env.PINECONE_NAMESPACE || "documents";

function getPineconeIndex() {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error("PINECONE_API_KEY is not configured.");
  }

  if (!indexHost || indexHost === "your_pinecone_index_host_here") {
    throw new Error("PINECONE_INDEX_HOST is not configured.");
  }

  const client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  return client.index(indexName, indexHost).namespace(namespaceName);
}

async function checkVectorStore() {
  return getPineconeIndex().describeIndexStats();
}

async function storeChunks(chunks) {
  if (!chunks.length) {
    throw new Error("At least one embedded chunk is required.");
  }

  const index = getPineconeIndex();

  await index.upsert({
    records: chunks.map((chunk) => ({
      id: chunk.id,
      values: chunk.embedding,
      metadata: { ...chunk.metadata, text: chunk.text }
    }))
  });

  return {
    indexName,
    namespace: namespaceName,
    storedCount: chunks.length
  };
}

async function searchChunks(questionEmbedding, options = {}) {
  const { documentId, limit = 3 } = options;
  const index = getPineconeIndex();
  const queryOptions = {
    vector: questionEmbedding,
    topK: limit,
    includeMetadata: true
  };

  if (documentId) {
    queryOptions.filter = { documentId: { $eq: documentId } };
  }

  const result = await index.query(queryOptions);

  return (result.matches || []).map((match) => ({
    id: match.id,
    text: match.metadata?.text || "",
    metadata: match.metadata,
    distance: 1 - (match.score || 0)
  }));
}

module.exports = { checkVectorStore, storeChunks, searchChunks };