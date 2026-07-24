"use client"

import { useState } from "react"
import { PenLine, Sparkles, FileText, Download, Copy, Check, Wand2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/page-header"
import { cn } from "@/lib/utils"
import { draftTemplates, clauseTypes } from "@/lib/data"
import { proxyBackendJson, downloadPdfFile } from "@/lib/backend-client"

function buildDraft(template: string, partyA: string, partyB: string, jurisdiction: string) {
  const a = partyA || "[Party A]"
  const b = partyB || "[Party B]"
  const j = jurisdiction || "[Jurisdiction]"
  return `${template.toUpperCase()}

This ${template} (the "Agreement") is entered into as of the date of last signature below, by and between ${a} ("Disclosing Party") and ${b} ("Receiving Party").

1. PURPOSE
The parties wish to explore a potential business relationship and, in connection therewith, may disclose certain confidential and proprietary information.

2. CONFIDENTIAL INFORMATION
"Confidential Information" means any non-public information disclosed by one party to the other, whether orally, in writing, or by inspection of tangible objects, that is designated as confidential or that reasonably should be understood to be confidential.

3. OBLIGATIONS
The Receiving Party shall (a) hold the Confidential Information in strict confidence, (b) not disclose it to third parties without prior written consent, and (c) use it solely for the stated purpose.

4. TERM
The obligations set forth herein shall remain in effect for a period of three (3) years from the date of disclosure.

5. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of ${j}, without regard to its conflict of laws principles.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

${a}                                   ${b}
By: _______________________            By: _______________________
Name:                                  Name:
Title:                                 Title:`
}

export default function DraftingPage() {
  const [selected, setSelected] = useState(draftTemplates[0])
  const [partyA, setPartyA] = useState("")
  const [partyB, setPartyB] = useState("")
  const [jurisdiction, setJurisdiction] = useState("")
  const [notes, setNotes] = useState("")
  const [draft, setDraft] = useState("")
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const [clause, setClause] = useState(clauseTypes[0])

  function generate() {
    setGenerating(true)
    setDraft("")
    proxyBackendJson<{ draft: string }>("/drafting", {
      method: "POST",
      body: JSON.stringify({
        template: selected.name,
        partyA,
        partyB,
        jurisdiction,
        notes,
      }),
    })
      .then((json) => setDraft(json.draft))
      .catch(() => setDraft(buildDraft(selected.name, partyA, partyB, jurisdiction)))
      .finally(() => setGenerating(false))
  }

  function copyDraft() {
    navigator.clipboard?.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        title="AI Legal Drafting Studio"
        description="Generate enterprise contracts, mutual NDAs, vendor notices, and custom clauses with structured precision."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="flex flex-col gap-6">
          <Card className="border-border/70 shadow-2xs">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-base font-bold font-serif">1. Select Agreement Template</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 gap-2.5">
              {draftTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-150",
                    selected.id === t.id
                      ? "border-primary bg-secondary/70 shadow-2xs font-semibold"
                      : "border-border/60 hover:bg-secondary/40 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <FileText className="size-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      {t.name}
                      {t.tag ? (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-500 uppercase">
                          {t.tag}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-2xs">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-base font-bold font-serif">2. Configure Agreement Parameters</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">First Party (Disclosing / Provider)</label>
                <Input value={partyA} onChange={(e) => setPartyA(e.target.value)} placeholder="e.g. Acme Corporation" className="h-9.5 text-xs bg-secondary/30" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Second Party (Receiving / Client)</label>
                <Input value={partyB} onChange={(e) => setPartyB(e.target.value)} placeholder="e.g. Vertex Ventures Ltd." className="h-9.5 text-xs bg-secondary/30" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Governing Jurisdiction</label>
                <Input value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} placeholder="e.g. State of Delaware" className="h-9.5 text-xs bg-secondary/30" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Special Instructions & Terms</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Specify non-standard terms, IP ownership, or custom exclusions..."
                  className="min-h-20 resize-none text-xs bg-secondary/30"
                />
              </div>
              <Button onClick={generate} disabled={generating} className="mt-2 gap-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90 py-2.5">
                <Wand2 className="size-4 text-amber-400" />
                {generating ? "Drafting Agreement..." : "Generate Agreement Draft"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-2xs">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-base font-bold font-serif">Instant Clause Generator</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {clauseTypes.map((c) => (
                  <button
                    key={c}
                    onClick={() => setClause(c)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                      clause === c
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "bg-secondary/60 border border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <Button onClick={generate} variant="outline" className="gap-2 text-xs font-semibold rounded-xl mt-1 border-border/80">
                <Sparkles className="size-3.5 text-amber-500" /> Generate {clause} Clause
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="flex min-h-[34rem] flex-col border-border/70 shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/50 bg-secondary/40 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <PenLine className="size-4 text-amber-500" />
              <span className="text-sm font-semibold text-foreground">{selected.name} · Document Preview</span>
            </div>
            {draft ? (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-semibold" onClick={copyDraft}>
                  {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied to Clipboard" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-semibold border-border/80 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400"
                  onClick={() => downloadPdfFile(`${selected.name} Procedural Document`, draft)}
                >
                  <Download className="size-3.5 text-amber-500" /> Download PDF
                </Button>
              </div>
            ) : null}
          </div>
          <div className="flex-1 p-6 bg-card">
            {generating ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Wand2 className="size-10 animate-pulse text-amber-500" />
                <p className="mt-4 font-semibold text-foreground text-base">Synthesizing {selected.name}...</p>
                <p className="mt-1 text-xs text-muted-foreground">Integrating parties, jurisdiction, and legal protections.</p>
              </div>
            ) : draft ? (
              <div className="rounded-xl border border-border/60 bg-background/50 p-6 shadow-inner">
                <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-foreground tracking-wide">
                  {draft}
                </pre>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center py-16">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground border border-border/50">
                  <FileText className="size-7" />
                </div>
                <p className="mt-4 font-semibold text-foreground text-base">Document Canvas Ready</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                  Select an agreement template, specify party names, and click <span className="font-medium text-foreground">Generate Agreement Draft</span>.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
