export type RiskSeverity = 'high' | 'medium' | 'low'

export type LegalDocument = {
  id: string
  name: string
  type: string
  pages: number
  sizeKb: number
  uploadedAt: string
  status: 'analyzed' | 'processing' | 'draft'
  riskScore: number
  parties: string[]
  summary: string
  clauses: { label: string; present: boolean; excerpt?: string }[]
  risks: {
    title: string
    severity: RiskSeverity
    detail: string
    suggestion: string
  }[]
}

export const documents: LegalDocument[] = [
  {
    id: 'doc-001',
    name: 'Master Services Agreement — Northwind Ltd.',
    type: 'Service Agreement',
    pages: 24,
    sizeKb: 486,
    uploadedAt: '2026-07-22',
    status: 'analyzed',
    riskScore: 68,
    parties: ['Acme Corporation', 'Northwind Ltd.'],
    summary:
      'A master services agreement governing consulting services provided by Acme Corporation to Northwind Ltd. The initial term runs 24 months with automatic 12-month renewals. Payment is net-45 with a 1.5% monthly late fee. Confidentiality survives 3 years post-termination. Liability is capped at fees paid in the preceding 12 months, but carve-outs for IP infringement are uncapped.',
    clauses: [
      { label: 'Confidentiality', present: true, excerpt: 'Each party shall protect Confidential Information for a period of three (3) years...' },
      { label: 'Payment Terms', present: true, excerpt: 'Invoices are due within forty-five (45) days of receipt...' },
      { label: 'Termination', present: true, excerpt: 'Either party may terminate for material breach upon 30 days written notice...' },
      { label: 'Indemnification', present: true, excerpt: 'The Provider shall indemnify Client against third-party IP claims...' },
      { label: 'Limitation of Liability', present: true, excerpt: 'Aggregate liability shall not exceed fees paid in the prior twelve months...' },
      { label: 'Governing Law', present: true, excerpt: 'This Agreement is governed by the laws of the State of Delaware...' },
      { label: 'Force Majeure', present: false },
      { label: 'Dispute Resolution', present: true, excerpt: 'Disputes shall be resolved by binding arbitration in New York...' },
    ],
    risks: [
      {
        title: 'Uncapped indemnification for IP claims',
        severity: 'high',
        detail: 'The liability cap excludes IP infringement claims, exposing the Provider to unlimited financial risk.',
        suggestion: 'Negotiate a super-cap (e.g., 2x annual fees) for IP indemnification instead of leaving it uncapped.',
      },
      {
        title: 'Missing force majeure clause',
        severity: 'medium',
        detail: 'No provision excuses performance during events beyond a party\u2019s control.',
        suggestion: 'Add a standard force majeure clause covering natural disasters, war, and government action.',
      },
      {
        title: 'Automatic renewal without reminder',
        severity: 'low',
        detail: 'The contract auto-renews for 12 months with a 60-day opt-out window and no notice obligation.',
        suggestion: 'Require the counterparty to send a renewal reminder 90 days before each term ends.',
      },
    ],
  },
  {
    id: 'doc-002',
    name: 'Mutual Non-Disclosure Agreement',
    type: 'NDA',
    pages: 6,
    sizeKb: 142,
    uploadedAt: '2026-07-20',
    status: 'analyzed',
    riskScore: 34,
    parties: ['Acme Corporation', 'Vertex Ventures'],
    summary:
      'A mutual NDA between Acme Corporation and Vertex Ventures for evaluating a potential investment. Confidential Information is broadly defined and protected for 5 years. The agreement includes standard exclusions and a return-of-materials obligation.',
    clauses: [
      { label: 'Confidentiality', present: true, excerpt: 'Recipient shall hold Confidential Information in strict confidence...' },
      { label: 'Term & Duration', present: true, excerpt: 'Obligations survive for five (5) years from disclosure...' },
      { label: 'Return of Materials', present: true, excerpt: 'Upon request, Recipient shall return or destroy all materials...' },
      { label: 'Governing Law', present: true, excerpt: 'Governed by the laws of California...' },
      { label: 'Non-Solicitation', present: false },
    ],
    risks: [
      {
        title: 'Broad definition of Confidential Information',
        severity: 'medium',
        detail: 'The definition may capture publicly available information without clear carve-outs.',
        suggestion: 'Add explicit exclusions for information that is public or independently developed.',
      },
      {
        title: 'No non-solicitation provision',
        severity: 'low',
        detail: 'Nothing prevents either party from soliciting the other\u2019s employees during evaluation.',
        suggestion: 'Consider a 12-month mutual non-solicitation clause.',
      },
    ],
  },
  {
    id: 'doc-003',
    name: 'Commercial Lease — Suite 400',
    type: 'Rental Agreement',
    pages: 31,
    sizeKb: 612,
    uploadedAt: '2026-07-18',
    status: 'analyzed',
    riskScore: 81,
    parties: ['Acme Corporation', 'Harbor Point Realty'],
    summary:
      'A five-year commercial lease for 4,200 sq ft of office space. Base rent escalates 4% annually. The tenant is responsible for a triple-net structure covering taxes, insurance, and CAM. Early termination triggers a substantial penalty equal to six months of rent.',
    clauses: [
      { label: 'Rent & Escalation', present: true, excerpt: 'Base rent increases four percent (4%) on each anniversary...' },
      { label: 'Maintenance (NNN)', present: true, excerpt: 'Tenant bears all taxes, insurance, and common area maintenance...' },
      { label: 'Termination', present: true, excerpt: 'Early termination requires payment equal to six (6) months rent...' },
      { label: 'Governing Law', present: true, excerpt: 'Governed by the laws of the State of Texas...' },
      { label: 'Sublease Rights', present: false },
      { label: 'Dispute Resolution', present: false },
    ],
    risks: [
      {
        title: 'Steep early-termination penalty',
        severity: 'high',
        detail: 'Six months of rent is due on early exit with no proration or mitigation clause.',
        suggestion: 'Negotiate a declining penalty and a landlord duty to mitigate by re-letting.',
      },
      {
        title: 'Uncapped CAM pass-throughs',
        severity: 'high',
        detail: 'Common area maintenance charges have no annual cap, creating budget uncertainty.',
        suggestion: 'Add a 5% annual cap on controllable CAM expenses.',
      },
      {
        title: 'No sublease or assignment rights',
        severity: 'medium',
        detail: 'The tenant cannot sublease, reducing flexibility if space needs change.',
        suggestion: 'Request a right to sublease with landlord consent not unreasonably withheld.',
      },
    ],
  },
  {
    id: 'doc-004',
    name: 'Employment Agreement — Senior Engineer',
    type: 'Employment Contract',
    pages: 12,
    sizeKb: 268,
    uploadedAt: '2026-07-15',
    status: 'processing',
    riskScore: 0,
    parties: ['Acme Corporation', 'J. Rivera'],
    summary: 'Document is being parsed and analyzed. Summary will be available shortly.',
    clauses: [],
    risks: [],
  },
]

export const draftTemplates = [
  { id: 'nda', name: 'Non-Disclosure Agreement', desc: 'Mutual or one-way confidentiality agreement.', tag: 'Popular' },
  { id: 'employment', name: 'Employment Contract', desc: 'Full-time employment terms and conditions.' },
  { id: 'rental', name: 'Rental Agreement', desc: 'Residential or commercial lease.' },
  { id: 'service', name: 'Service Agreement', desc: 'Scope, deliverables, and payment terms.' },
  { id: 'privacy', name: 'Privacy Policy', desc: 'GDPR / CCPA compliant privacy notice.' },
  { id: 'terms', name: 'Terms & Conditions', desc: 'Website or SaaS terms of service.' },
  { id: 'notice', name: 'Legal Notice', desc: 'Formal notice or demand letter.' },
  { id: 'mou', name: 'Memorandum of Understanding', desc: 'Non-binding statement of intent.' },
  { id: 'affidavit', name: 'Affidavit', desc: 'Sworn written statement of facts.' },
]

export const clauseTypes = [
  'Arbitration',
  'Confidentiality',
  'Non-compete',
  'Indemnification',
  'Intellectual Property',
  'Force Majeure',
]

export const activity = [
  { id: 1, action: 'Risk analysis completed', target: 'Commercial Lease — Suite 400', time: '12 min ago', kind: 'risk' as const },
  { id: 2, action: 'Draft generated', target: 'Mutual NDA — Vertex Ventures', time: '1 hour ago', kind: 'draft' as const },
  { id: 3, action: 'Document uploaded', target: 'Employment Agreement — Senior Engineer', time: '2 hours ago', kind: 'upload' as const },
  { id: 4, action: 'Chat session', target: 'Master Services Agreement — Northwind', time: 'Yesterday', kind: 'chat' as const },
  { id: 5, action: 'Summary exported (PDF)', target: 'Master Services Agreement — Northwind', time: 'Yesterday', kind: 'export' as const },
]

export type SearchPassage = {
  docId: string
  docName: string
  clause: string
  excerpt: string
  page: number
  score: number
}

// Flatten document clauses into a searchable corpus for semantic search.
export const searchCorpus: SearchPassage[] = documents.flatMap((doc) =>
  doc.clauses
    .filter((c) => c.present && c.excerpt)
    .map((c, i) => ({
      docId: doc.id,
      docName: doc.name,
      clause: c.label,
      excerpt: c.excerpt as string,
      page: ((i * 3) % doc.pages) + 1,
      score: 0,
    })),
)

export const searchSuggestions = [
  'termination penalties',
  'liability cap and indemnification',
  'auto-renewal terms',
  'confidentiality duration',
  'governing law jurisdiction',
]

export type ResearchResult = {
  id: string
  title: string
  citation: string
  court: string
  year: number
  summary: string
  tags: string[]
  relevance: number
}

export const researchResults: ResearchResult[] = [
  {
    id: 'r1',
    title: 'ProCD, Inc. v. Zeidenberg',
    citation: '86 F.3d 1447 (7th Cir. 1996)',
    court: '7th Circuit Court of Appeals',
    year: 1996,
    summary:
      'Held that shrinkwrap license terms are enforceable so long as the buyer has an opportunity to review and reject them, shaping modern clickwrap and browsewrap enforceability.',
    tags: ['Contracts', 'Licensing', 'E-commerce'],
    relevance: 96,
  },
  {
    id: 'r2',
    title: 'Hadley v. Baxendale',
    citation: '9 Ex. 341 (1854)',
    court: 'Court of Exchequer',
    year: 1854,
    summary:
      'Established the foundational rule limiting consequential damages to losses that were reasonably foreseeable at the time of contracting — central to limitation-of-liability drafting.',
    tags: ['Contracts', 'Damages', 'Liability'],
    relevance: 91,
  },
  {
    id: 'r3',
    title: 'Comedy Club, Inc. v. Improv West Associates',
    citation: '553 F.3d 1277 (9th Cir. 2009)',
    court: '9th Circuit Court of Appeals',
    year: 2009,
    summary:
      'Addressed the enforceability of non-compete covenants under California law, reinforcing that overly broad restraints on trade are void even within franchise arrangements.',
    tags: ['Non-compete', 'Employment', 'Antitrust'],
    relevance: 88,
  },
  {
    id: 'r4',
    title: 'AT&T Mobility LLC v. Concepcion',
    citation: '563 U.S. 333 (2011)',
    court: 'U.S. Supreme Court',
    year: 2011,
    summary:
      'Held that the Federal Arbitration Act preempts state laws barring class-action waivers in arbitration clauses, strengthening enforceability of arbitration provisions.',
    tags: ['Arbitration', 'Dispute Resolution', 'Consumer'],
    relevance: 84,
  },
  {
    id: 'r5',
    title: 'Pennzoil Co. v. Texaco, Inc.',
    citation: '481 U.S. 1 (1987)',
    court: 'U.S. Supreme Court',
    year: 1987,
    summary:
      'A landmark tortious-interference case underscoring that a binding agreement in principle can create enforceable obligations even before a formal contract is signed.',
    tags: ['Contracts', 'Tortious Interference'],
    relevance: 79,
  },
]

export function severityLabel(score: number) {
  if (score >= 66) return { label: 'High risk', tone: 'high' as const }
  if (score >= 40) return { label: 'Moderate risk', tone: 'medium' as const }
  return { label: 'Low risk', tone: 'low' as const }
}
