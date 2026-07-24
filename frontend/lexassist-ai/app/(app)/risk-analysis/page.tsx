"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ShieldAlert,
  ArrowRight,
  Loader2,
  CheckCircle2,
  TriangleAlert,
  Upload,
  FileText,
  X,
  CloudUpload,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { RiskBadge } from "@/components/risk-badge"
import { cn } from "@/lib/utils"
import { proxyBackendJson } from "@/lib/backend-client"
import { type RiskSeverity, severityLabel } from "@/lib/data"

type RiskDocument = {
  id: string
  name: string
  type: string
  riskScore: number
  risks: Array<{ title: string; severity: RiskSeverity; detail: string; suggestion: string }>
}

const severityRank: Record<RiskSeverity, number> = { high: 0, medium: 1, low: 2 }

export default function RiskAnalysisPage() {
  const [documents, setDocuments] = useState<RiskDocument[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [scanning, setScanning] = useState(false)
  const [scannedId, setScannedId] = useState("")
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  function loadDocuments() {
    proxyBackendJson<{ documents: RiskDocument[] }>("/risk-analysis")
      .then((json) => {
        setDocuments(json.documents)
        if (json.documents.length > 0 && !selectedId) {
          setSelectedId(json.documents[0].id)
          setScannedId(json.documents[0].id)
        }
      })
      .catch(() => setDocuments([]))
  }

  useEffect(() => {
    loadDocuments()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doc = useMemo(
    () => documents.find((d) => d.id === scannedId) ?? documents[0],
    [scannedId, documents],
  )

  const sortedRisks = useMemo(
    () => [...(doc?.risks ?? [])].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]),
    [doc],
  )

  const counts = useMemo(() => {
    const c: Record<RiskSeverity, number> = { high: 0, medium: 0, low: 0 }
    doc?.risks.forEach((r) => (c[r.severity] += 1))
    return c
  }, [doc])

  async function uploadAndScan(file: File) {
    setUploadError("")
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files are supported.")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      // Step 1: Upload document
      const uploadRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"}/documents`,
        { method: "POST", body: formData },
      )
      if (!uploadRes.ok) throw new Error("Upload failed")
      const uploadJson = await uploadRes.json()
      const newDocId: string = uploadJson.document?.id ?? ""

      // Refresh document list
      await loadDocumentsAsync()

      // Step 2: Auto-run risk scan on the newly uploaded document
      if (newDocId) {
        setSelectedId(newDocId)
        setScanning(true)
        const scanJson = await proxyBackendJson<{ document: RiskDocument }>("/risk-analysis", {
          method: "POST",
          body: JSON.stringify({ documentId: newDocId }),
        })
        setScannedId(scanJson.document.id)
        // Refresh list to get updated risk counts
        await loadDocumentsAsync()
      }
    } catch (err) {
      setUploadError("Upload or scan failed. Please try again.")
      console.error(err)
    } finally {
      setUploading(false)
      setScanning(false)
    }
  }

  async function loadDocumentsAsync() {
    return proxyBackendJson<{ documents: RiskDocument[] }>("/risk-analysis").then((json) => {
      setDocuments(json.documents)
      return json.documents
    })
  }

  function runScan() {
    if (!selectedId) return
    setScanning(true)
    proxyBackendJson<{ document: RiskDocument }>("/risk-analysis", {
      method: "POST",
      body: JSON.stringify({ documentId: selectedId }),
    })
      .then((json) => {
        setScannedId(json.document.id)
        loadDocumentsAsync()
      })
      .finally(() => setScanning(false))
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadAndScan(file)
    e.target.value = ""
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadAndScan(file)
  }

  const risk = doc ? severityLabel(doc.riskScore) : { label: "Low risk", tone: "low" as const }
  const isLoading = uploading || scanning

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Automated Risk & Clause Audit"
        description="Upload a contract or select an existing document to flag uncapped liabilities, missing clauses, steep penalties, and get actionable fixes."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left panel: document selector + upload ── */}
        <Card className="lg:col-span-1 border-border/70 shadow-2xs">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-base font-bold font-serif">Select Document</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-3">

            {/* ── Upload drop zone ── */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !isLoading && fileInputRef.current?.click()}
              className={cn(
                "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-all duration-200",
                dragOver
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border/60 hover:border-primary/50 hover:bg-secondary/30",
                isLoading && "pointer-events-none opacity-60",
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileInput}
              />
              {isLoading ? (
                <>
                  <Loader2 className="size-7 animate-spin text-primary" />
                  <p className="text-xs font-medium text-muted-foreground">
                    {uploading && !scanning ? "Uploading PDF…" : "Running AI Risk Scan…"}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CloudUpload className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Upload PDF</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Drag & drop or click to browse</p>
                  </div>
                  <span className="rounded-full border border-border/60 bg-background px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    PDF only
                  </span>
                </>
              )}
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
                <X className="size-3.5 shrink-0" />
                {uploadError}
              </div>
            )}

            {/* ── Existing documents list ── */}
            {documents.length > 0 && (
              <>
                <div className="flex items-center gap-2 py-1">
                  <div className="h-px flex-1 bg-border/40" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    or select existing
                  </span>
                  <div className="h-px flex-1 bg-border/40" />
                </div>

                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-0.5">
                  {documents.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedId(d.id)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition-all duration-150",
                        selectedId === d.id
                          ? "border-primary bg-secondary/70 shadow-2xs font-semibold"
                          : "border-border/60 hover:bg-secondary/40 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <div className="flex items-start gap-2 w-full">
                        <FileText className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground line-clamp-1">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pl-5">
                        <span className="rounded bg-background border px-1.5 py-0.5 text-[10px]">{d.type}</span>
                        <span>·</span>
                        <span>{d.risks.length} findings</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ── Run scan button (for existing doc selection) ── */}
            <Button
              onClick={runScan}
              disabled={isLoading || !selectedId}
              className="mt-1 gap-2 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 font-medium py-2.5"
            >
              {scanning ? (
                <>
                  <Loader2 className="size-4 animate-spin text-amber-400" /> Running AI Scan…
                </>
              ) : (
                <>
                  <ShieldAlert className="size-4" /> Run Risk Scan
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ── Right panel: results ── */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Risk score card */}
          <Card className="border-border/70 shadow-2xs overflow-hidden">
            <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-secondary/40 via-card to-card">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Overall Contract Risk
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="font-serif text-4xl font-bold tracking-tight text-foreground">
                    {doc?.riskScore ?? 0}
                  </p>
                  <span className="text-sm font-medium text-muted-foreground">/ 100</span>
                </div>
                <div className="mt-2.5">
                  <RiskBadge severity={risk.tone} />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex min-w-20 flex-col items-center rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 shadow-2xs">
                  <span className="font-serif text-2xl font-bold text-rose-500">{counts.high}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">High Risk</span>
                </div>
                <div className="flex min-w-20 flex-col items-center rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 shadow-2xs">
                  <span className="font-serif text-2xl font-bold text-amber-500">{counts.medium}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Medium</span>
                </div>
                <div className="flex min-w-20 flex-col items-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 shadow-2xs">
                  <span className="font-serif text-2xl font-bold text-emerald-500">{counts.low}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Low Risk</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Findings card */}
          <Card className="border-border/70 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
              <div>
                <CardTitle className="text-lg font-bold font-serif">Flagged Findings & Mitigation</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{sortedRisks.length} issues identified by AI analysis</p>
              </div>
              <Button
                render={<Link href="/chat" />}
                nativeButton={false}
                variant="ghost"
                size="sm"
                className="gap-1 text-xs font-semibold text-primary"
              >
                Discuss in Chat <ArrowRight className="size-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-4">
              {/* Empty state */}
              {sortedRisks.length === 0 && !isLoading && (
                <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
                  <div className="flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-secondary/40">
                    <Upload className="size-6 text-muted-foreground/60" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">No document scanned yet</p>
                    <p className="text-xs mt-1">Upload a PDF above or select an existing document and click Run Risk Scan.</p>
                  </div>
                </div>
              )}

              {isLoading && sortedRisks.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">AI is analysing your document…</p>
                </div>
              )}

              {sortedRisks.map((r) => (
                <div key={r.title} className="rounded-xl border border-border/70 bg-card p-4.5 shadow-2xs">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl border",
                        r.severity === "high" && "bg-rose-500/10 text-rose-500 border-rose-500/20",
                        r.severity === "medium" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                        r.severity === "low" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                      )}
                    >
                      <TriangleAlert className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-foreground">{r.title}</h3>
                        <RiskBadge severity={r.severity} />
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.detail}</p>

                      <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                        <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-emerald-500" />
                        <div className="text-xs leading-relaxed text-foreground">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Suggested Negotiation Fix: </span>
                          {r.suggestion}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
