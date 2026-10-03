# DocuMind

DocuMind is an AI-powered document question-answering platform. A user uploads a PDF and chats with an assistant that answers questions using the contents of that document.

The project is built around Retrieval-Augmented Generation (RAG). Instead of asking an AI model to answer from general knowledge, DocuMind retrieves relevant information from the uploaded document and gives that information to the model as context.

## Project goal

The goal of DocuMind is to make long documents easier to understand and search through natural conversation.

A user can upload a study guide, resume, policy document, or other text-based PDF and ask questions such as:

- What qualifications are listed in the document?
- What are the main responsibilities?
- Summarize the requirements in section two.
- Which technologies are mentioned?
- What information is missing from the document?

The assistant is instructed to stay grounded in the uploaded document and clearly say when the answer cannot be found.

## Tech stack

### Frontend

- React for the interactive user interface
- Vite for frontend development and production builds
- Lucide React for interface icons
- Responsive CSS for desktop and mobile layouts
- Vercel for frontend hosting

### Backend

- Node.js as the runtime
- Express as the web server and API layer
- Multer for receiving PDF uploads
- pdf-parse for extracting text from PDFs
- Render for backend hosting

### AI services

- Google Gemini Embeddings for converting document text and questions into vectors
- Google Gemini Flash for generating grounded natural-language answers

### Vector database

- Pinecone Serverless for storing and searching document embeddings
- Dense vectors with cosine similarity
- Metadata for document identity, chunk position, and source text

## High-level architecture

DocuMind has three main parts:

1. The React frontend handles document uploads, chat messages, loading states, errors, and answer presentation.
2. The Node.js and Express backend controls PDF processing, chunking, embedding, retrieval, prompt construction, and Gemini communication.
3. Pinecone stores the document vectors and finds the chunks most relevant to a user's question.

The main data flow is:

```text
User interface
    -> Node.js backend
    -> PDF processing and chunking
    -> Gemini embeddings
    -> Pinecone vector search
    -> Gemini answer generation
    -> User interface
```

## Complete RAG workflow

### Phase 1: PDF upload and text extraction

The user selects a PDF from the frontend. The file is sent to the Express backend.

The backend validates that the file is a PDF and extracts its selectable text using pdf-parse. The result is a plain text representation of the document along with basic information such as the filename and page count.

This is the first important boundary in the system. If the PDF is scanned, image-based, or has a complex layout, the extracted text may be incomplete or out of order. The quality of all later phases depends on the quality of this extracted text.

### Phase 2: Text chunking

A complete document is usually too large to send to Gemini for every question. The extracted text is therefore divided into smaller chunks.

DocuMind creates chunks at word boundaries rather than cutting through words. The current chunking strategy uses a maximum size of approximately 1,000 characters and an overlap of approximately 150 characters.

The overlap repeats a small amount of text between neighboring chunks. This helps preserve meaning when a sentence or related idea crosses a chunk boundary.

Each chunk receives:

- A unique chunk ID
- A document ID
- A position within the document
- Its original text
- Its character count

Good chunking is important because retrieval can only return the text that was stored. If a chunk is too large, it may contain unrelated information. If it is too small, important context may be separated.

### Phase 3: Embedding generation

Each text chunk is sent to Gemini's embedding model. The model converts the meaning of the chunk into a numerical vector.

An embedding is not an answer and it is not readable text. It is a list of numbers that represents the semantic position of the chunk in a high-dimensional space.

Text with similar meaning should produce vectors that are close together. For example, a chunk saying that an employee can work remotely should be close to a question asking whether working from home is allowed.

DocuMind generates 768-dimensional embeddings for document chunks. The same embedding model is later used for user questions so their vectors can be compared meaningfully.

Document chunks use a document-retrieval task type. Questions use a query-retrieval task type. This helps the embedding model optimize the two types of text for search.

### Phase 4: Vector storage in Pinecone

The generated vectors are stored in a Pinecone Serverless index.

Each Pinecone record contains:

- The chunk ID
- The embedding vector
- The original chunk text
- The document ID
- The chunk index
- Other metadata used for filtering and source references

Pinecone organizes these high-dimensional vectors so that similar vectors can be found efficiently. It uses cosine similarity to compare the question vector with the stored document vectors.

The document text is stored with the vector because retrieval must return the original context that will later be given to Gemini.

### Phase 5: Question embedding and retrieval

When the user asks a question, the backend sends the question to Gemini's embedding model and receives a query vector.

The query vector is sent to Pinecone. Pinecone compares it with the document vectors and returns the closest matching chunks.

DocuMind normally retrieves the top three chunks. Each result includes the original text, metadata, and a similarity score or distance.

This phase is the retrieval part of RAG. It does not generate an answer. Its job is to find the most useful evidence from the document.

Retrieval can be limited to a specific document using its document ID. This prevents content from different uploaded documents from being mixed together.

### Phase 6: RAG prompt construction

The backend combines the retrieved chunks and the user's question into a controlled prompt.

The prompt tells Gemini to:

- Act as a document question-answering assistant
- Use only the retrieved document context
- Avoid outside knowledge
- Avoid inventing details
- Give a clear and concise answer
- Say that the answer cannot be found when the context does not contain it

The retrieved chunks become the evidence section of the prompt. The user's question becomes the question section.

This is the point where retrieval and generation meet. Pinecone finds the evidence, and Gemini turns that evidence into a readable response.

### Phase 7: Answer generation

Gemini receives the RAG prompt and generates the final response.

The backend sends the answer and source metadata back to the frontend. The interface displays the answer and identifies the retrieved source chunks.

If the question is unrelated to the document, or if the retrieved context does not contain enough evidence, DocuMind returns a controlled fallback response instead of pretending to know the answer.

### Phase 8: Frontend presentation

The React frontend presents the result as a conversation.

It handles:

- Upload progress
- Document indexing status
- Chat history
- Loading indicators
- Answer display
- Source indicators
- API errors
- Responsive desktop and mobile layouts

The user does not need to understand embeddings, vectors, Pinecone, or prompts to use the application. Those details remain behind the interface as the retrieval pipeline.

## User flow

1. The user opens DocuMind.
2. The user selects a PDF.
3. DocuMind uploads and processes the document.
4. The system extracts the PDF text.
5. The system divides the text into overlapping chunks.
6. Gemini creates embeddings for the chunks.
7. Pinecone stores the chunks and vectors.
8. The interface shows that the document is ready.
9. The user asks a question in the chat box.
10. Gemini creates an embedding for the question.
11. Pinecone retrieves the most relevant document chunks.
12. The backend creates a grounded prompt from the retrieved context.
13. Gemini generates the answer.
14. The frontend displays the answer and source indicators.
15. If the answer is not in the document, DocuMind clearly says so.

## Why this project is RAG

A basic chatbot sends a question directly to an AI model. The model answers from its training and the prompt it receives.

DocuMind adds a retrieval layer before generation:

```text
Question
    -> retrieve relevant document evidence
    -> give evidence to Gemini
    -> generate an answer grounded in that evidence
```

This allows the assistant to answer questions about a private, user-uploaded document without retraining the model.

## Current limitations

- Scanned PDFs need OCR support because they may not contain selectable text.
- Complex tables and multi-column layouts may not extract perfectly.
- Answer quality depends on extraction, chunking, retrieval, and model availability.
- Gemini free-tier limits can affect generation during heavy testing.
- The current document ID is derived from the uploaded filename.
- Conversation history is currently maintained in the active browser session.
- Very large or highly formatted documents may require more advanced processing.
