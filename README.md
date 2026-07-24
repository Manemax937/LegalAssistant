<<<<<<< HEAD
# LegalAssistant
=======
# LexAssist AI — integration guide

This workspace contains two parts of the app:

- `frontend/lexassist-ai` — the Next.js UI
- `ai-lawyer` — the Python backend and legal-RAG service

The frontend is currently working and can talk to the backend API. The remaining work is mostly around making the backend fully persistent and production-ready.

---

## Current status

### Working now
- The Next.js frontend builds successfully.
- The FastAPI backend starts successfully.
- The backend health endpoint is available at `http://127.0.0.1:8000/health`.
- The frontend can fetch data from the backend directly.

### Still to implement
- Persistent database storage for documents, metadata, and analysis results.
- Real ingestion pipeline for uploaded files.
- Full FAISS/vector-store update flow for newly uploaded documents.
- Stronger backend error handling and file validation.
- Optional authentication and user/session management.
- Production deployment settings.

---

## How to run locally

### 1) Start the backend
From `ai-lawyer`:

```powershell
& "C:/Users/manep/AppData/Local/Microsoft/WindowsApps/python3.13.exe" api_server.py
```

Or with Uvicorn directly:

```powershell
& "C:/Users/manep/AppData/Local/Microsoft/WindowsApps/python3.13.exe" -m uvicorn api_server:app --reload --host 0.0.0.0 --port 8000
```

### 2) Start the frontend
From `frontend/lexassist-ai`:

```powershell
npm run dev
```

### 3) Open the app
- Frontend: `http://localhost:3000`
- Backend health: `http://127.0.0.1:8000/health`

---

## Environment variables

### Backend: `ai-lawyer/.env`
Required keys may include:

- `GROQ_API_KEY`
- `OLLAMA_HOST` if you use a local Ollama model endpoint
- any future database connection string, for example `DATABASE_URL`

### Frontend: `frontend/lexassist-ai/.env.local`
Currently used for backend connectivity:

- `NEXT_PUBLIC_BACKEND_API_URL=http://127.0.0.1:8000`
- `BACKEND_API_URL=http://127.0.0.1:8000`

---

## Remaining backend work

### 1) Add a real database layer
Right now the backend mostly uses in-memory seed data.

Recommended next step:
- Choose a database: SQLite for local development, PostgreSQL for production.
- Create tables for:
  - documents
  - document clauses
  - risk findings
  - chat history
  - research requests
  - drafts
  - uploads and processing status

Suggested minimum schema:
- `documents(id, name, type, pages, size_kb, uploaded_at, status, risk_score, summary, source_file)`
- `document_parties(id, document_id, name)`
- `clause_findings(id, document_id, label, present, excerpt)`
- `risk_findings(id, document_id, title, severity, detail, suggestion)`
- `chat_messages(id, document_id, role, content, created_at)`

### 2) Persist uploads
When a user uploads a file:
- save it to disk or object storage
- create a database row
- queue the file for parsing
- run OCR/text extraction if needed
- split into chunks for retrieval
- update the vector index
- store the final status and analysis results

### 3) Connect the vector database
The current backend should be extended so that:
- new uploads are indexed immediately
- searches hit the latest embeddings
- risk analysis and chat responses use the same source of truth

If you keep FAISS locally:
- store the index path in config
- persist metadata alongside embeddings
- rebuild or incrementally update the index after each upload

### 4) Improve API responses
Standardize the backend JSON shapes so the frontend always receives:
- `documents`
- `document`
- `results`
- `answer`
- `draft`
- `risks`
- `counts`

This makes the UI easier to maintain and reduces fallback logic.

### 5) Remove fallback mock logic
Once the backend is stable:
- remove local mock data from the frontend API bridge
- keep only backend proxying
- optionally keep a small error state for offline mode

---

## Suggested implementation order

1. Add database models and migrations.
2. Persist uploaded documents.
3. Wire parsing and vector indexing to the upload flow.
4. Make `/documents`, `/chat`, `/search`, `/risk-analysis`, and `/research` read from the database/vector store.
5. Add tests for API responses.
6. Remove fallback mock paths from the frontend.

---

## File map

### Frontend
- `frontend/lexassist-ai/app/(app)/chat/page.tsx`
- `frontend/lexassist-ai/app/(app)/documents/page.tsx`
- `frontend/lexassist-ai/app/(app)/drafting/page.tsx`
- `frontend/lexassist-ai/app/(app)/research/page.tsx`
- `frontend/lexassist-ai/app/(app)/risk-analysis/page.tsx`
- `frontend/lexassist-ai/app/(app)/search/page.tsx`
- `frontend/lexassist-ai/components/upload-zone.tsx`
- `frontend/lexassist-ai/lib/backend-client.ts`

### Backend
- `ai-lawyer/api_server.py`
- `ai-lawyer/rag_pipeline.py`
- `ai-lawyer/vector_database.py`
- `ai-lawyer/requirements.txt`

---

## Notes

- The frontend build has already been verified.
- The backend server currently runs on port `8000`.
- The app is functional for demo/testing, but the database-backed persistence layer is still the main remaining piece.

---

## Next step

If you want to continue, the best follow-up is to replace the in-memory backend seed data with a real database + document store so uploads survive restarts and search/chat results stay in sync.
>>>>>>> f18fb25 (Initial commit: LexAssist Legal AI platform with backend API and modern Next.js SaaS UI)
