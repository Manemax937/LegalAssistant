import {
  clauseTypes,
  documents as seedDocuments,
  researchResults,
  searchCorpus,
  severityLabel,
  type LegalDocument,
  type ResearchResult,
  type SearchPassage,
  type RiskSeverity,
} from "@/lib/data"

export type ChatRequest = {
  query: string
  documentId?: string
  documentName?: string
  history?: { role: "user" | "assistant"; content: string }[]
}

export type DraftRequest = {
  template: string
  partyA?: string
  partyB?: string
  jurisdiction?: string
  notes?: string
}

export type SearchRequest = {
  query: string
}

export type ResearchRequest = {
  query: string
  topic?: string | null
}

export type UploadRequest = {
  name: string
  type?: string
}

function hash(input: string) {
  let value = 0
  for (let i = 0; i < input.length; i += 1) {
    value = (value * 31 + input.charCodeAt(i)) >>> 0
  }
  return value
}

function pickRiskScore(name: string) {
  return 18 + (hash(name) % 68)
}

function pickType(name: string, fallback = "Contract") {
  const lower = name.toLowerCase()
  if (lower.endsWith(".docx")) return "DOCX"
  if (lower.endsWith(".txt")) return "TXT"
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "Image"
  if (lower.includes("nda")) return "NDA"
  if (lower.includes("lease") || lower.includes("rental")) return "Rental Agreement"
  if (lower.includes("employment")) return "Employment Contract"
  if (lower.includes("policy")) return "Policy"
  return fallback
}

export function cloneDocuments() {
  return [...seedDocuments]
}

export function getDocumentById(id: string) {
  return seedDocuments.find((doc) => doc.id === id)
}

export function normalizeDocType(type?: string, name = "Uploaded document") {
  return pickType(name, type || "Contract")
}

export function buildUploadedDocument(input: UploadRequest): LegalDocument {
  const uploadedAt = new Date().toISOString().slice(0, 10)
  const riskScore = pickRiskScore(input.name)
  const type = normalizeDocType(input.type, input.name)

  return {
    id: `doc-${Date.now()}`,
    name: input.name,
    type,
    pages: 0,
    sizeKb: 0,
    uploadedAt,
    status: riskScore > 70 ? "processing" : "analyzed",
    riskScore,
    parties: ["Uploaded Party A", "Uploaded Party B"],
    summary:
      "Uploaded document received. The backend route is ready for OCR, parsing, chunking, embeddings, and RAG analysis integration.",
    clauses: [
      { label: "Confidentiality", present: true, excerpt: "Clause scan placeholder from the API route." },
      { label: "Indemnification", present: true, excerpt: "Clause scan placeholder from the API route." },
      { label: "Governing Law", present: true, excerpt: "Clause scan placeholder from the API route." },
    ],
    risks: [
      {
        title: "Backend parsing pipeline not yet connected",
        severity: riskScore >= 66 ? "high" : riskScore >= 40 ? "medium" : "low",
        detail:
          "This uploaded document is currently represented by a generated record until the Python RAG backend is wired in.",
        suggestion: "Point this route to the ai-lawyer service for OCR, chunking, embedding, and retrieval.",
      },
    ],
  }
}

function extractDocContext(request: ChatRequest) {
  if (request.documentId) {
    const doc = getDocumentById(request.documentId)
    if (doc) return doc.name
  }
  return request.documentName || "your document"
}

export function buildChatResponse(request: ChatRequest) {
  const query = request.query.toLowerCase()
  const docName = extractDocContext(request)

  if (query.includes("risk") || query.includes("risky")) {
    return {
      answer: `Based on the available sections of ${docName}, the main risks are liability caps, renewal windows, and any one-sided indemnity language. I can also break these down clause-by-clause if you want a redline-style summary.`,
      citations: [{ docName, section: "§ 9.3 / § 14.1" }],
    }
  }

  if (query.includes("summar") || query.includes("overview")) {
    return {
      answer: `Here is a concise summary of ${docName}: the agreement defines the parties, sets the term and payment structure, includes confidentiality obligations, and allocates liability with a specific cap. If you want, I can turn this into a formal executive summary next.`,
      citations: [{ docName, section: "Summary view" }],
    }
  }

  if (query.includes("notice") || query.includes("termination")) {
    return {
      answer: `For ${docName}, the notice period is typically the most negotiation-sensitive area. The current draft usually combines an auto-renewal mechanic with a written non-renewal window, so missing that deadline can extend the agreement for another term.`,
      citations: [{ docName, section: "§ 14.1 Term & Renewal" }],
    }
  }

  if (query.includes("liab") || query.includes("indemn")) {
    return {
      answer: `The liability and indemnity provisions in ${docName} should be reviewed together. A balanced version usually caps mutual liability, preserves a narrow super-cap for third-party IP claims, and avoids unlimited carve-outs that only benefit one side.`,
      citations: [{ docName, section: "§ 9.3 Limitation of Liability" }],
    }
  }

  return {
    answer: `I reviewed the selected context for ${docName}. The backend route is ready to answer follow-up questions about obligations, clauses, risk, or drafting guidance once the Python service is connected.`,
    citations: request.documentId ? [{ docName, section: "Context linked" }] : undefined,
  }
}

export function buildDraft(request: DraftRequest) {
  const template = request.template || "Agreement"
  const partyA = request.partyA || "[Party A]"
  const partyB = request.partyB || "[Party B]"
  const jurisdiction = request.jurisdiction || "[Jurisdiction]"

  return {
    title: `${template} Draft`,
    draft: `${template.toUpperCase()}\n\nThis ${template} (the "Agreement") is entered into as of the date of last signature below, by and between ${partyA} ("First Party") and ${partyB} ("Second Party").\n\n1. PURPOSE\nThe parties wish to explore a commercial relationship and may disclose confidential and proprietary information in connection with that purpose.\n\n2. CONFIDENTIAL INFORMATION\n"Confidential Information" means non-public information disclosed by one party to the other, whether orally, in writing, electronically, or by inspection of tangible objects, that is designated confidential or should reasonably be understood to be confidential.\n\n3. OBLIGATIONS\nThe receiving party shall (a) hold Confidential Information in strict confidence, (b) not disclose it to any third party without prior written consent, and (c) use it only for the stated purpose.\n\n4. TERM\nThe obligations set forth herein shall remain in effect for three (3) years from the date of disclosure, except for trade secrets, which shall remain protected as long as they are trade secrets under applicable law.\n\n5. GOVERNING LAW\nThis Agreement shall be governed by and construed in accordance with the laws of ${jurisdiction}, without regard to conflict of laws principles.\n\nIN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.`,
    clauses: clauseTypes,
  }
}

function scorePassage(passage: SearchPassage, terms: string[]) {
  const haystack = `${passage.clause} ${passage.excerpt}`.toLowerCase()
  const hits = terms.filter((term) => haystack.includes(term)).length
  const base = hits / Math.max(1, terms.length)
  return Math.min(99, Math.round(base * 82 + (hits > 0 ? 12 : 0)))
}

export function searchDocuments(query: string) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 2)

  if (terms.length === 0) return []

  return searchCorpus
    .map((passage) => ({ ...passage, score: scorePassage(passage, terms) }))
    .filter((passage) => passage.score > 0)
    .sort((a, b) => b.score - a.score)
}

export function analyzeDocument(documentId: string) {
  const doc = getDocumentById(documentId)
  if (!doc) return null

  const risk = severityLabel(doc.riskScore)
  const counts: Record<RiskSeverity, number> = { high: 0, medium: 0, low: 0 }

  doc.risks.forEach((item) => {
    counts[item.severity] += 1
  })

  return {
    document: doc,
    risk,
    counts,
    risks: doc.risks,
  }
}

export function researchByQuery(query: string, topic?: string | null) {
  const lower = query.toLowerCase()
  const results = researchResults
    .filter((result) => {
      if (!topic) return true
      return result.tags.includes(topic)
    })
    .map((result) => {
      const relevanceBoost =
        lower.includes("arbitr") && result.tags.includes("Arbitration")
          ? 8
          : lower.includes("liab") && result.tags.includes("Liability")
            ? 8
            : lower.includes("non-compete") && result.tags.includes("Non-compete")
              ? 8
              : 0
      return { ...result, relevance: Math.min(99, result.relevance + relevanceBoost) }
    })
    .sort((a, b) => b.relevance - a.relevance)

  const answer = `Based on the available authorities, the strongest results for "${query}" emphasize enforceability, contract clarity, and the relevant public-policy limits for the issue. The routes are ready to swap in the Python backend once the service is exposed over HTTP.`

  return { answer, results }
}

export function getDocumentNames() {
  return seedDocuments.map((doc) => doc.name)
}
