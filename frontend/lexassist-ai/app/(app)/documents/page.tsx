"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FileText, Search, Clock, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/page-header'
import { RiskBadge } from '@/components/risk-badge'
import { UploadZone } from '@/components/upload-zone'
import { cn } from '@/lib/utils'
import { severityLabel } from '@/lib/data'
import { proxyBackendJson } from '@/lib/backend-client'

type DocumentRecord = {
  id: string
  name: string
  type: string
  pages: number
  uploadedAt: string
  status: string
  riskScore: number
  parties: string[]
}

const baseFilters = ['All', 'Service Agreement', 'NDA', 'Rental Agreement', 'Employment Contract']

export default function DocumentsPage() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [documents, setDocuments] = useState<DocumentRecord[]>([])

  async function loadDocuments() {
    const json = await proxyBackendJson<{ documents: DocumentRecord[] }>('/documents')
    setDocuments(json.documents)
  }

  useEffect(() => {
    loadDocuments().catch(() => setDocuments([]))
  }, [])

  const filters = useMemo(
    () => ['All', ...new Set([...baseFilters.slice(1), ...documents.map((doc) => doc.type)])],
    [documents],
  )

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      const matchesQuery =
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.type.toLowerCase().includes(query.toLowerCase())
      const matchesFilter = filter === 'All' || d.type === filter
      return matchesQuery && matchesFilter
    })
  }, [documents, query, filter])

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        title="Document Intelligence Workspace"
        description="Upload, parse, organize, and analyze legal agreements with AI-powered RAG vector retrieval."
      />

      <Card className="border-border/70 shadow-2xs">
        <CardContent className="p-6">
          <UploadZone onUploaded={() => loadDocuments().catch(() => setDocuments([]))} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150',
                filter === f
                  ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                  : 'bg-secondary/60 border border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents or parties..."
            className="h-9.5 pl-9 text-xs bg-secondary/30 border-border/60"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((doc) => {
          const risk = severityLabel(doc.riskScore)
          const processing = doc.status === 'processing'
          return (
            <div key={doc.id} className="group">
              <Card className="card-hover-lift h-full border-border/70 bg-card p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-2xs">
                      <FileText className="size-5" />
                    </div>
                    {processing ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">
                        <Clock className="size-3 animate-spin" /> Processing
                      </span>
                    ) : (
                      <RiskBadge severity={risk.tone} />
                    )}
                  </div>
                  
                  <h3 className="mt-4 line-clamp-2 font-semibold text-base leading-snug text-foreground group-hover:text-primary transition-colors">
                    {doc.name}
                  </h3>
                  
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-secondary border border-border/50 px-1.5 py-0.2 font-medium text-foreground">{doc.type}</span>
                    <span>•</span>
                    <span>{doc.pages} pages</span>
                  </div>

                  {doc.parties && doc.parties.length > 0 && (
                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {doc.parties.map((p) => (
                        <span
                          key={p}
                          className="rounded-md bg-secondary/80 border border-border/40 px-2 py-0.5 text-[11px] font-medium text-foreground/80"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4 text-xs">
                  <span className="text-muted-foreground">Uploaded {doc.uploadedAt}</span>
                  <Link
                    href="/chat"
                    className="flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    <span>Ask AI</span>
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </Card>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/80 bg-secondary/10 py-16 text-center">
          <FileText className="mx-auto size-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-semibold text-foreground">No matching documents found</p>
          <p className="mt-1 text-xs text-muted-foreground">Try clearing your search query or uploading a new file.</p>
        </div>
      )}
    </div>
  )
}
