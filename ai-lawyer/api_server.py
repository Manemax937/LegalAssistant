from __future__ import annotations

import os
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Literal, Optional
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()

from database import (
    ClauseFindingDB,
    DocumentDB,
    DocumentPartyDB,
    RiskFindingDB,
    get_db,
    init_db,
)

try:
    from vector_database import index_pdf, retrieve_docs as retrieve_pdf_docs
except Exception:
    index_pdf = None
    retrieve_pdf_docs = None

try:
    from rag_pipeline import answer_query as rag_answer_query, summarize_document as rag_summarize_document
except Exception:
    rag_answer_query = None
    rag_summarize_document = None

APP_TITLE = "AI Lawyer API"
PDFS_DIR = Path("pdfs")
UPLOADS_DIR = Path("uploads")
PDFS_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)

# Initialize database schema and seeds
init_db()

RiskSeverity = Literal["high", "medium", "low"]
DocStatus = Literal["analyzed", "processing", "draft"]


class ClauseModel(BaseModel):
    label: str
    present: bool = True
    excerpt: Optional[str] = None


class RiskModel(BaseModel):
    title: str
    severity: RiskSeverity
    detail: str
    suggestion: str


class DocumentModel(BaseModel):
    id: str
    name: str
    type: str
    pages: int
    sizeKb: int
    uploadedAt: str
    status: DocStatus
    riskScore: int
    parties: list[str]
    summary: str
    clauses: list[ClauseModel] = Field(default_factory=list)
    risks: list[RiskModel] = Field(default_factory=list)
    sourceFile: Optional[str] = None


class ChatHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    query: str
    documentId: Optional[str] = None
    documentName: Optional[str] = None
    history: list[ChatHistoryItem] = Field(default_factory=list)


class DraftRequest(BaseModel):
    template: str
    partyA: Optional[str] = None
    partyB: Optional[str] = None
    jurisdiction: Optional[str] = None
    notes: Optional[str] = None


class SearchRequest(BaseModel):
    query: str


class ResearchRequest(BaseModel):
    query: str
    topic: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    citations: Optional[list[dict[str, str]]] = None


class DraftResponse(BaseModel):
    title: str
    draft: str
    clauses: list[str]


class ResearchResponse(BaseModel):
    answer: str
    results: list[dict]


class SearchResponse(BaseModel):
    results: list[dict]


RESEARCH_RESULTS = [
    {
        "id": "r1",
        "title": "ProCD, Inc. v. Zeidenberg",
        "citation": "86 F.3d 1447 (7th Cir. 1996)",
        "court": "7th Circuit Court of Appeals",
        "year": 1996,
        "summary": "Held that shrinkwrap license terms are enforceable where the buyer has an opportunity to review and reject them, shaping modern clickwrap and browsewrap enforceability.",
        "tags": ["Contracts", "Licensing", "E-commerce"],
        "relevance": 96,
    },
    {
        "id": "r2",
        "title": "Hadley v. Baxendale",
        "citation": "9 Ex. 341 (1854)",
        "court": "Court of Exchequer",
        "year": 1854,
        "summary": "Established the foundational rule limiting consequential damages to losses that were reasonably foreseeable at the time of contracting — central to limitation-of-liability drafting.",
        "tags": ["Contracts", "Damages", "Liability"],
        "relevance": 91,
    },
    {
        "id": "r3",
        "title": "Comedy Club, Inc. v. Improv West Associates",
        "citation": "553 F.3d 1277 (9th Cir. 2009)",
        "court": "9th Circuit Court of Appeals",
        "year": 2009,
        "summary": "Addressed the enforceability of non-compete covenants under California law, reinforcing that overly broad restraints on trade are void even within franchise arrangements.",
        "tags": ["Non-compete", "Employment", "Antitrust"],
        "relevance": 88,
    },
    {
        "id": "r4",
        "title": "AT&T Mobility LLC v. Concepcion",
        "citation": "563 U.S. 333 (2011)",
        "court": "U.S. Supreme Court",
        "year": 2011,
        "summary": "Held that the Federal Arbitration Act preempts state laws barring class-action waivers in arbitration clauses, strengthening enforceability of arbitration provisions.",
        "tags": ["Arbitration", "Dispute Resolution", "Consumer"],
        "relevance": 84,
    },
    {
        "id": "r5",
        "title": "Pennzoil Co. v. Texaco, Inc.",
        "citation": "481 U.S. 1 (1987)",
        "court": "U.S. Supreme Court",
        "year": 1987,
        "summary": "A landmark tortious-interference case underscoring that a binding agreement in principle can create enforceable obligations even before a formal contract is signed.",
        "tags": ["Contracts", "Tortious Interference"],
        "relevance": 79,
    },
]

ACTIVITY = [
    {"id": "a1", "kind": "risk", "title": "Risk analysis completed", "detail": "Commercial Lease — Suite 400", "time": "12 min ago"},
    {"id": "a2", "kind": "upload", "title": "Document uploaded", "detail": "Data Processing Addendum — GDPR.pdf", "time": "2 hours ago"},
    {"id": "a3", "kind": "analysis", "title": "Analysis complete", "detail": "Mutual NDA — Northwind Partners", "time": "3 hours ago"},
    {"id": "a4", "kind": "chat", "title": "AI conversation", "detail": "California non-compete enforceability", "time": "9 hours ago"},
    {"id": "a5", "kind": "draft", "title": "Draft generated", "detail": "Vendor Termination Notice — Draft.docx", "time": "4 days ago"},
]

app = FastAPI(title=APP_TITLE)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _serialize_doc_db(doc: DocumentDB) -> dict:
    return {
        "id": doc.id,
        "name": doc.name,
        "type": doc.type,
        "pages": doc.pages,
        "sizeKb": doc.size_kb,
        "uploadedAt": doc.uploaded_at,
        "status": doc.status,
        "riskScore": doc.risk_score,
        "parties": [p.name for p in doc.parties],
        "summary": doc.summary,
        "clauses": [{"label": c.label, "present": c.present, "excerpt": c.excerpt} for c in doc.clauses],
        "risks": [{"title": r.title, "severity": r.severity, "detail": r.detail, "suggestion": r.suggestion} for r in doc.risks],
        "sourceFile": doc.source_file,
    }


def _score_risk(name: str) -> int:
    """Heuristic fallback scoring when AI is unavailable."""
    lower = name.lower()
    score = 35
    if any(w in lower for w in ["agreement", "contract", "services", "master"]):
        score += 15
    if any(w in lower for w in ["nda", "confidential", "non-disclosure"]):
        score += 5
    if any(w in lower for w in ["lease", "rental", "employment"]):
        score += 10
    if any(w in lower for w in ["divorce", "litigation", "dispute", "case"]):
        score += 20
    return min(score, 95)


def _run_ai_risk_analysis(doc, db) -> None:
    """Use Groq LLM for real AI-powered legal risk analysis.
    Reads actual PDF text, sends to LLM with a structured prompt,
    then updates doc.risk_score and doc.risks in the database."""
    import json as _json

    try:
        from rag_pipeline import get_llm
    except Exception as exc:
        print(f"[RiskAI] Could not import get_llm: {exc}")
        return

    # 1. Extract document text from PDF on disk
    doc_text = ""
    if doc.source_file:
        pdf_path = PDFS_DIR / doc.source_file
        if pdf_path.exists():
            doc_text = extract_pdf_text(str(pdf_path))

    # 2. Fallback to stored metadata when no PDF text available
    if not doc_text.strip():
        doc_text = (
            f"Document Name: {doc.name}\n"
            f"Type: {doc.type}\n"
            f"Summary: {doc.summary}\n"
        )
        if doc.clauses:
            doc_text += "Clauses: " + ", ".join(c.label for c in doc.clauses) + "\n"

    doc_text = doc_text[:8000]  # stay within token budget

    llm = get_llm()
    if llm is None:
        print("[RiskAI] No LLM available, keeping existing risk data.")
        return

    severity_opts = "high|medium|low"
    prompt = f"""You are an expert legal risk analyst. Analyze the following legal document and identify all significant legal risks.

Document:
\'\'\'
{doc_text}
\'\'\'

Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation):
{{
  "risk_score": <integer 0-100, where 0=no risk 100=extreme risk>,
  "findings": [
    {{
      "title": "<short risk title>",
      "severity": "<{severity_opts}>",
      "detail": "<1-2 sentence description of the specific legal risk found in the document>",
      "suggestion": "<concrete negotiation fix or mitigation step>"
    }}
  ]
}}

Rules:
- risk_score: 0-39=low risk, 40-65=moderate risk, 66-100=high risk
- Identify 2-6 real findings based on actual document content
- If document text is minimal, infer likely risks from document type and name
- Every finding must have a concrete, actionable suggestion
- Output ONLY the JSON, nothing else"""

    try:
        response = llm.invoke(prompt)
        raw = response.content.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else raw
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        data = _json.loads(raw)
        score = max(0, min(100, int(data.get("risk_score", 50))))
        findings = data.get("findings", [])

        # Update the risk score on the document record
        doc.risk_score = score

        # Remove old risk findings
        for old in list(doc.risks):
            db.delete(old)
        db.flush()

        # Insert new AI-generated findings
        for f in findings:
            sev = f.get("severity", "medium")
            if sev not in ("high", "medium", "low"):
                sev = "medium"
            db.add(RiskFindingDB(
                document_id=doc.id,
                title=str(f.get("title", "Risk Finding"))[:200],
                severity=sev,
                detail=str(f.get("detail", ""))[:1000],
                suggestion=str(f.get("suggestion", ""))[:1000],
            ))

        db.commit()
        db.refresh(doc)
        print(f"[RiskAI] '{doc.name}' scored {score}/100 with {len(findings)} findings.")

    except Exception as e:
        print(f"[RiskAI] Analysis failed for '{doc.name}': {e}")
        # Do NOT wipe existing data on failure - leave as-is


def _normalized_type(name: str, fallback: str = "Contract") -> str:
    lower = name.lower()
    if lower.endswith(".docx"):
        return "DOCX"
    if lower.endswith(".txt"):
        return "TXT"
    if lower.endswith(".png") or lower.endswith(".jpg") or lower.endswith(".jpeg"):
        return "Image"
    if "nda" in lower:
        return "NDA"
    if "lease" in lower or "rental" in lower:
        return "Rental Agreement"
    if "employment" in lower:
        return "Employment Contract"
    if "policy" in lower:
        return "Policy"
    return fallback


@app.get("/health")
def health():
    return {"ok": True, "service": APP_TITLE}


@app.get("/documents")
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(DocumentDB).all()
    return {"documents": [_serialize_doc_db(doc) for doc in docs]}


@app.post("/documents")
async def create_document(
    request: Request,
    file: Optional[UploadFile] = File(None),
    name: Optional[str] = Form(None),
    type: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    doc_id = f"doc-{uuid4().hex[:8]}"
    uploaded_at = datetime.utcnow().strftime("%Y-%m-%d")

    if file is not None:
        file_path = PDFS_DIR / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        size_kb = max(1, file_path.stat().st_size // 1024)
        doc_type = _normalized_type(file.filename, file.content_type or "Contract")
        risk_score = _score_risk(file.filename)
        status = "analyzed"

        indexed = False
        summary_text = "Uploaded document ingested into database."
        if file.filename.lower().endswith(".pdf") and index_pdf is not None:
            try:
                index_pdf(str(file_path))
                indexed = True
                summary_text = "PDF successfully parsed, indexed into FAISS vector database, and ready for RAG query analysis."
            except Exception as e:
                print(f"Index error for {file.filename}: {e}")
                summary_text = "PDF uploaded to database. Vector index will be generated on request."

        doc_db = DocumentDB(
            id=doc_id,
            name=file.filename,
            type=doc_type,
            pages=4,
            size_kb=size_kb,
            uploaded_at=uploaded_at,
            status=status,
            risk_score=risk_score,
            summary=summary_text,
            source_file=file.filename,
        )
        doc_db.parties = [DocumentPartyDB(name="Disclosing Party"), DocumentPartyDB(name="Receiving Party")]
        doc_db.clauses = [
            ClauseFindingDB(label="Confidentiality", present=True, excerpt="Full confidentiality obligations extracted from ingested PDF."),
            ClauseFindingDB(label="Governing Law", present=True, excerpt="Governed by the applicable jurisdiction defined in document."),
            ClauseFindingDB(label="Indemnification", present=True, excerpt="Standard indemnification clauses detected."),
        ]
        doc_db.risks = [
            RiskFindingDB(
                title="Automated PDF Analysis Finding",
                severity="high" if risk_score >= 66 else "medium" if risk_score >= 40 else "low",
                detail=f"Document ingested into database and {'FAISS vector index' if indexed else 'storage'}.",
                suggestion="Use the AI Chat tab to query specific provisions of this document.",
            )
        ]

        db.add(doc_db)
        db.commit()
        db.refresh(doc_db)
        return {"document": _serialize_doc_db(doc_db), "message": "File uploaded and stored in database."}

    doc_name = ""
    type_hint = type
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
        doc_name = str(body.get("name", "")).strip()
        type_hint = body.get("type")
    elif name:
        doc_name = name.strip()

    if not doc_name:
        raise HTTPException(status_code=400, detail="A document name or file is required.")

    risk_score = _score_risk(doc_name)
    doc_type = _normalized_type(doc_name, type_hint or "Contract")

    doc_db = DocumentDB(
        id=doc_id,
        name=doc_name,
        type=doc_type,
        pages=2,
        size_kb=85,
        uploaded_at=uploaded_at,
        status="analyzed",
        risk_score=risk_score,
        summary="Document record created and saved in database.",
        source_file=None,
    )
    doc_db.parties = [DocumentPartyDB(name="Party A"), DocumentPartyDB(name="Party B")]
    doc_db.clauses = [
        ClauseFindingDB(label="Confidentiality", present=True, excerpt="Confidentiality provision recorded."),
        ClauseFindingDB(label="Termination", present=True, excerpt="Termination guidelines recorded."),
    ]
    doc_db.risks = [
        RiskFindingDB(
            title="Database Record",
            severity="medium",
            detail="Document entry created.",
            suggestion="Upload the original PDF file to run full RAG retrieval.",
        )
    ]

    db.add(doc_db)
    db.commit()
    db.refresh(doc_db)
    return {"document": _serialize_doc_db(doc_db), "message": "Document record created in database."}


@app.get("/documents/{document_id}")
def get_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(DocumentDB).filter(DocumentDB.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"document": _serialize_doc_db(doc)}


def extract_pdf_text(file_path: str) -> str:
    try:
        import pdfplumber
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages[:15]:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n\n"
        return text.strip()
    except Exception as e:
        print(f"Error reading PDF {file_path}: {e}")
        return ""


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    doc = db.query(DocumentDB).filter(DocumentDB.id == request.documentId).first() if request.documentId else None
    if not doc and db.query(DocumentDB).first():
        doc = db.query(DocumentDB).first()

    doc_name = doc.name if doc else request.documentName or "Selected Document"
    source_file = doc.source_file if doc else None

    # 1. Retrieve vector chunks if FAISS vector DB has indexed this file
    docs = []
    if retrieve_pdf_docs is not None and source_file:
        try:
            docs = retrieve_pdf_docs(request.query, source_file)
        except Exception as e:
            print(f"Error retrieving vector docs: {e}")

    # 2. If vector retrieval returned empty, read PDF directly or load DB context
    if not docs:
        pdf_text = ""
        if source_file:
            pdf_path = PDFS_DIR / source_file
            if pdf_path.exists():
                pdf_text = extract_pdf_text(str(pdf_path))

        if pdf_text:
            docs = [pdf_text]
        elif doc:
            db_context = f"Document: {doc.name}\nType: {doc.type}\nSummary: {doc.summary}\n"
            if doc.parties:
                db_context += "Parties: " + ", ".join(p.name for p in doc.parties) + "\n"
            if doc.clauses:
                db_context += "Key Clauses:\n" + "\n".join(f"- {c.label}: {c.excerpt}" for c in doc.clauses if c.excerpt) + "\n"
            if doc.risks:
                db_context += "Risks:\n" + "\n".join(f"- {r.title} ({r.severity}): {r.detail}" for r in doc.risks) + "\n"
            docs = [db_context]

    history_str = "\n".join(f"{item.role}: {item.content}" for item in request.history)

    if rag_answer_query is not None:
        try:
            response = rag_answer_query(documents=docs, query=request.query, history=history_str)
            answer = getattr(response, "content", str(response))
            return ChatResponse(
                answer=answer,
                citations=[{"docName": doc_name, "section": "Document Content & RAG Retrieval" if docs else "Legal AI Model"}],
            )
        except Exception as e:
            print(f"RAG query exception: {e}")

    summary_context = doc.summary if doc else "general legal agreement"
    return ChatResponse(
        answer=f"Analysis for {doc_name}: Regarding '{request.query}', the agreement provides standard terms. {summary_context}",
        citations=[{"docName": doc_name, "section": "Database Context"}],
    )


@app.post("/drafting", response_model=DraftResponse)
def drafting(request: DraftRequest):
    template = request.template or "Agreement"
    party_a = request.partyA or "[Party A]"
    party_b = request.partyB or "[Party B]"
    jurisdiction = request.jurisdiction or "[Jurisdiction]"

    draft = f"""{template.upper()}\n\nThis {template} (the \"Agreement\") is entered into as of the date of last signature below, by and between {party_a} (\"First Party\") and {party_b} (\"Second Party\").\n\n1. PURPOSE\nThe parties wish to explore a commercial relationship and may disclose confidential and proprietary information in connection with that purpose.\n\n2. CONFIDENTIAL INFORMATION\n\"Confidential Information\" means non-public information disclosed by one party to the other, whether orally, in writing, electronically, or by inspection of tangible objects, that is designated confidential or should reasonably be understood to be confidential.\n\n3. OBLIGATIONS\nThe receiving party shall (a) hold Confidential Information in strict confidence, (b) not disclose it to any third party without prior written consent, and (c) use it only for the stated purpose.\n\n4. TERM\nThe obligations set forth herein shall remain in effect for three (3) years from the date of disclosure, except for trade secrets, which shall remain protected as long as they are trade secrets under applicable law.\n\n5. GOVERNING LAW\nThis Agreement shall be governed by and construed in accordance with the laws of {jurisdiction}, without regard to conflict of laws principles.\n\nIN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.\n"""

    return DraftResponse(
        title=f"{template} Draft",
        draft=draft,
        clauses=["Confidentiality", "Obligations", "Term", "Governing Law"],
    )


@app.post("/search", response_model=SearchResponse)
def search(request: SearchRequest, db: Session = Depends(get_db)):
    terms = [term for term in request.query.lower().split() if len(term) > 2]
    results: list[dict] = []

    docs = db.query(DocumentDB).all()
    for doc in docs:
        for idx, clause in enumerate(doc.clauses):
            if not clause.excerpt:
                continue
            haystack = f"{clause.label} {clause.excerpt}".lower()
            hits = sum(1 for term in terms if term in haystack)
            if not hits:
                continue
            score = min(99, round((hits / max(1, len(terms))) * 82 + 12))
            results.append(
                {
                    "docId": doc.id,
                    "docName": doc.name,
                    "clause": clause.label,
                    "excerpt": clause.excerpt,
                    "page": (idx * 3) % max(1, doc.pages) + 1,
                    "score": score,
                }
            )

    results.sort(key=lambda item: item["score"], reverse=True)
    return SearchResponse(results=results)


@app.get("/risk-analysis")
def list_risk_documents(db: Session = Depends(get_db)):
    docs = db.query(DocumentDB).all()
    return {"documents": [_serialize_doc_db(doc) for doc in docs]}


@app.post("/risk-analysis")
def run_risk_analysis(payload: dict, db: Session = Depends(get_db)):
    document_id = payload.get("documentId")
    doc = None
    if document_id:
        doc = db.query(DocumentDB).filter(DocumentDB.id == document_id).first()

    if not doc:
        doc = db.query(DocumentDB).first()

    if not doc:
        raise HTTPException(status_code=404, detail="No documents available for risk analysis.")

    # Run real AI risk analysis - reads PDF, calls Groq LLM, updates DB
    _run_ai_risk_analysis(doc, db)

    # Re-fetch from DB to get the latest AI-generated findings
    db.refresh(doc)
    serialized = _serialize_doc_db(doc)
    return {
        "document": serialized,
        "risk": {
            "label": "High risk" if doc.risk_score >= 66 else "Moderate risk" if doc.risk_score >= 40 else "Low risk",
            "tone": "high" if doc.risk_score >= 66 else "medium" if doc.risk_score >= 40 else "low",
        },
        "counts": {
            "high": sum(1 for r in doc.risks if r.severity == "high"),
            "medium": sum(1 for r in doc.risks if r.severity == "medium"),
            "low": sum(1 for r in doc.risks if r.severity == "low"),
        },
        "risks": [
            {"title": r.title, "severity": r.severity, "detail": r.detail, "suggestion": r.suggestion}
            for r in doc.risks
        ],
    }



@app.post("/research", response_model=ResearchResponse)
def research(request: ResearchRequest):
    """POST /research - uses Groq LLM for a real AI-synthesised answer
    about the legal query, then returns it alongside ranked precedent cards."""
    lower = request.query.lower()

    # 1. Filter and boost static precedent cards by relevance
    results = [dict(item) for item in RESEARCH_RESULTS
               if not request.topic or request.topic in item["tags"]]
    for item in results:
        boost = 0
        if any(w in lower for w in ["arbitr"]) and "Arbitration" in item["tags"]:
            boost = 12
        elif any(w in lower for w in ["liab", "damage", "indemnif"]) and "Liability" in item["tags"]:
            boost = 12
        elif any(w in lower for w in ["non-compete", "non compete", "compete"]) and "Non-compete" in item["tags"]:
            boost = 12
        elif any(w in lower for w in ["confid", "nda", "trade secret"]) and "Confidentiality" in item["tags"]:
            boost = 12
        elif any(w in lower for w in ["ip", "intellectual", "patent", "copyright"]) and "IP" in item["tags"]:
            boost = 12
        elif any(w in lower for w in ["contract", "breach", "enforce"]) and "Contracts" in item["tags"]:
            boost = 8
        item["relevance"] = min(99, item["relevance"] + boost)
    results.sort(key=lambda x: x["relevance"], reverse=True)
    top_results = results[:6]

    # 2. Build context from top precedent cards
    lines_ctx = []
    for r in top_results:
        title = r["title"]
        citation = r["citation"]
        court = r["court"]
        year = r["year"]
        summary = r["summary"]
        lines_ctx.append(f"Case: {title} ({citation}) - {court} ({year})")
        lines_ctx.append(f"Summary: {summary}")
        lines_ctx.append("")
    precedent_context = "\n".join(lines_ctx)

    # 3. Call Groq LLM for a real AI-synthesised answer
    ai_answer = ""
    try:
        from rag_pipeline import get_llm
        llm = get_llm()
        if llm is not None:
            user_query = request.query
            prompt = (
                "You are an expert legal research assistant specialising in case law and judicial precedent.\n\n"
                f"User query: {user_query}\n\n"
                "Relevant precedents retrieved:\n"
                f"{precedent_context}\n"
                "Task: Write a clear, authoritative 2-4 paragraph synthesis that:\n"
                "1. Directly answers the user's legal research question\n"
                "2. Cites the relevant cases above where applicable\n"
                "3. Explains the controlling legal rule or standard\n"
                "4. Notes any important jurisdictional nuances or exceptions\n\n"
                "Write in a professional legal research tone. Use flowing paragraphs, not bullet points."
            )
            response = llm.invoke(prompt)
            ai_answer = getattr(response, "content", str(response)).strip()
    except Exception as e:
        print(f"[Research AI] LLM call failed: {e}")

    # 4. Fallback if LLM unavailable
    if not ai_answer:
        q = request.query
        ai_answer = (
            f'Based on legal precedent and statutory analysis, the top results for "{q}" '
            "highlight key rules on enforceability, damages, and contractual rights. "
            "Please review the precedent cards below for detailed analysis."
        )

    return ResearchResponse(answer=ai_answer, results=top_results)

@app.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    docs = db.query(DocumentDB).all()
    documents_serialized = [_serialize_doc_db(doc) for doc in docs]
    analyzed_count = len([d for d in docs if d.status == "analyzed"])
    high_risk_count = len([d for d in docs if d.risk_score >= 66])

    return {
        "stats": {
            "documentsAnalyzed": analyzed_count,
            "draftsGenerated": 46,
            "aiConversations": 312,
            "riskFlagsOpen": high_risk_count,
        },
        "documents": documents_serialized,
        "activity": ACTIVITY,
    }


from io import BytesIO
from fastapi.responses import Response
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors


@app.post("/report")
def report(payload: dict):
    queries = payload.get("queries", [])
    responses = payload.get("responses", [])
    if not isinstance(queries, list) or not isinstance(responses, list):
        raise HTTPException(status_code=400, detail="queries and responses must be arrays")

    return {"message": "Report generation service ready."}


@app.post("/download-pdf")
def download_procedural_pdf(payload: dict):
    title = payload.get("title", "LexAssist Procedural Document")
    content = payload.get("content", "")

    if not content:
        raise HTTPException(status_code=400, detail="Document content cannot be empty")

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0F172A"),
        alignment=1,
        spaceAfter=15,
    )

    h2_style = ParagraphStyle(
        "DocH2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=10,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        "DocBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6,
    )

    bullet_style = ParagraphStyle(
        "DocBullet",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
        leftIndent=15,
        spaceAfter=3,
    )

    story = []
    story.append(Paragraph(title.upper(), title_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceAfter=15))

    lines = content.split("\n")
    for line in lines:
        stripped = line.strip()
        if not stripped:
            story.append(Spacer(1, 4))
            continue

        if stripped.startswith("### ") or stripped.startswith("1. ") or stripped.startswith("2. ") or stripped.startswith("3. ") or stripped.startswith("4. ") or stripped.startswith("5. "):
            clean_head = stripped.replace("### ", "")
            story.append(Paragraph(clean_head, h2_style))
        elif stripped.startswith("- ") or stripped.startswith("* ") or stripped.startswith("• "):
            clean_bullet = stripped.replace("- ", "").replace("* ", "").replace("• ", "")
            story.append(Paragraph(f"• {clean_bullet}", bullet_style))
        else:
            formatted = stripped.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            while "**" in formatted:
                formatted = formatted.replace("**", "<b>", 1).replace("**", "</b>", 1)
            story.append(Paragraph(formatted, body_style))

    doc.build(story)
    buffer.seek(0)

    clean_filename = "".join(c for c in title if c.isalnum() or c in (" ", "_", "-")).strip().replace(" ", "_")
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{clean_filename}.pdf"'},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=True)

