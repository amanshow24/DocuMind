import { useRef, useState } from "react";
import { ArrowUp, Check, FileText, LoaderCircle, Paperclip, Sparkles, Upload, X } from "lucide-react";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3535";

function App() {
  const fileInput = useRef(null);
  const [document, setDocument] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");

  async function uploadDocument(file) {
    if (!file) return;
    setError("");
    setUploading(true);
    setDocument(null);
    setMessages([]);
    const formData = new FormData();
    formData.append("document", file);

    try {
      const response = await fetch(`${apiUrl}/api/documents/store`, { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The document could not be processed.");
      setDocument(result);
      setMessages([{ role: "assistant", text: "Your document is ready. Ask me anything about it." }]);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
  }

  async function askQuestion(event) {
    event.preventDefault();
    const text = question.trim();
    if (!text || !document || thinking) return;
    setQuestion("");
    setError("");
    setThinking(true);
    setMessages((current) => [...current, { role: "user", text }]);

    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, documentId: document.documentId, limit: 3 })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The answer could not be generated.");
      setMessages((current) => [...current, { role: "assistant", text: result.answer, sources: result.sources }]);
    } catch (chatError) {
      setError(chatError.message);
    } finally {
      setThinking(false);
    }
  }

  function removeDocument() {
    setDocument(null);
    setMessages([]);
    setError("");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Sparkles size={17} /></span><div><b>DocuMind</b><small>Ask questions about your documents</small></div></div>
        <span className="private-status"><i /> Ready</span>
      </header>
      <div className="workspace">
        <aside className="sidebar">
          <span className="eyebrow">Document</span>
          {document ? (
            <div className="document-card">
              <span className="file-icon"><FileText size={18} /></span>
              <div><b>{document.fileName}</b><small>{document.pageCount} pages · {document.chunkCount} chunks</small></div>
              <button className="icon-button" onClick={removeDocument} title="Remove document" aria-label="Remove document"><X size={15} /></button>
            </div>
          ) : <div className="empty-library"><FileText size={20} /><b>No document loaded</b><span>Upload a PDF to begin.</span></div>}
          <p className="sidebar-note">Answers are based on the uploaded document.</p>
        </aside>
        <section className={`chat-panel ${document ? "has-document" : ""}`}>
          <div className="heading"><div><span className="eyebrow">Conversation</span><h1>Ask a question</h1></div><span className={`pipeline ${document ? "ready" : ""}`}>{document ? <Check size={14} /> : <i />}{document ? "Ready" : "Upload a PDF"}</span></div>
          <div className="messages">
            {!messages.length && <div className="welcome"><span><FileText size={24} /></span><h2>Start with a document</h2><p>Upload a PDF, then ask questions about its contents.</p></div>}
            {messages.map((message, index) => <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
              {message.role === "assistant" && <span className="avatar"><Sparkles size={14} /></span>}
              <div className="message-content"><p>{message.text}</p>{message.sources?.length > 0 && <div className="sources">{message.sources.map((source) => <span key={source.id}>Source {(source.metadata?.chunkIndex ?? 0) + 1}</span>)}</div>}</div>
            </article>)}
            {thinking && <article className="message assistant"><span className="avatar"><Sparkles size={14} /></span><div className="thinking"><i /><i /><i /></div></article>}
          </div>
          {error && <div className="error">{error}</div>}
          {document ? <form className="composer" onSubmit={askQuestion}><button type="button" className="icon-button" onClick={() => fileInput.current?.click()} title="Replace document" aria-label="Replace document"><Paperclip size={18} /></button><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question about your PDF..." disabled={thinking} /><button className="send" type="submit" disabled={!question.trim() || thinking} title="Send question" aria-label="Send question"><ArrowUp size={18} /></button></form> : <button className="upload" onClick={() => fileInput.current?.click()} disabled={uploading}>{uploading ? <LoaderCircle className="spin" size={22} /> : <Upload size={22} />}<b>{uploading ? "Indexing your document..." : "Upload a PDF to start"}</b><small>PDF files up to 10 MB</small></button>}
          <input ref={fileInput} hidden type="file" accept="application/pdf,.pdf" onChange={(event) => uploadDocument(event.target.files?.[0])} />
        </section>
      </div>
    </main>
  );
}

export default App;