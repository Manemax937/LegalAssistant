"use client"

import { useMemo, useState } from "react"
import { BookOpen, Landmark, Loader2, Sparkles, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { researchResults } from "@/lib/data"
import { cn } from "@/lib/utils"
import { proxyBackendJson } from "@/lib/backend-client"

const topics = ["Contracts", "Arbitration", "Non-compete", "Liability", "Employment", "Licensing"]

const examplePrompts = [
  "Are class-action waivers in arbitration clauses enforceable?",
  "How are consequential damages limited in contracts?",
  "Is a non-compete valid under California law?",
]

export default function ResearchPage() {
  const [query, setQuery] = useState("")
  const [activeTopic, setActiveTopic] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [answered, setAnswered] = useState(false)
  const [summary, setSummary] = useState("")
  const [results, setResults] = useState(researchResults)

  const visible = useMemo(() => {
    let r = [...results].sort((a, b) => b.relevance - a.relevance)
    if (activeTopic) {
      r = r.filter((x) => x.tags.includes(activeTopic))
    }
    return r
  }, [activeTopic, results])

  function run() {
    if (!query.trim()) return
    setLoading(true)
    setAnswered(false)
    proxyBackendJson<{ answer: string; results: typeof researchResults }>("/research", {
      method: "POST",
      body: JSON.stringify({ query, topic: activeTopic }),
    })
      .then((json) => {
        setResults(json.results)
        setSummary(json.answer)
        setAnswered(true)
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        title="Legal Research & Case Law Precedent"
        description="Query controlling judicial precedent, statutory interpretations, and appellate court decisions with AI."
      />

      <Card className="border-border/70 shadow-2xs">
        <CardContent className="p-6">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe your legal issue or scenario (e.g. Enforceability of non-compete covenants or consequential damages caps)..."
            className="min-h-28 resize-none bg-secondary/30 border-border/60 text-sm focus:bg-background transition-all"
            aria-label="Research question"
          />
          <div className="mt-3.5 flex flex-wrap gap-2">
            {examplePrompts.map((p) => (
              <button
                key={p}
                onClick={() => setQuery(p)}
                className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground hover:border-border"
              >
                💡 {p}
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <Button
              onClick={run}
              disabled={loading || !query.trim()}
              className="gap-2 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 font-medium px-5"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin text-amber-400" /> Searching Precedents...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 text-amber-400" /> Research Case Law
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {answered && (
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-2xs">
          <CardHeader className="flex flex-row items-center gap-3 border-b border-amber-500/20 pb-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-2xs">
              <Sparkles className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold font-serif text-foreground">AI Judicial Precedent Synthesis</CardTitle>
              <p className="text-xs text-muted-foreground">Synthesized from primary legal authorities</p>
            </div>
          </CardHeader>
          <CardContent className="pt-4 text-sm leading-relaxed text-foreground/90 space-y-3">
            <p>
              {summary ||
                "Based on the controlling appellate authorities below, the prevailing legal view supports enforceability where notice is conspicuous and standard exclusions apply. Courts evaluate foreseeability under Hadley v. Baxendale and statutory limits under federal or state jurisdiction."}
            </p>
            <p className="text-xs text-muted-foreground italic border-t border-amber-500/20 pt-3">
              Disclaimer: Precedents are retrieved via AI vector retrieval for legal research assistance. Always verify citations against official court reporters.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Filter Precedents by Topic
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTopic(null)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              activeTopic === null
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "bg-secondary/60 border border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            All Precedents
          </button>
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTopic(t)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                activeTopic === t
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-secondary/60 border border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {visible.map((r) => (
          <Card key={r.id} className="card-hover-lift border-border/70 bg-card p-5 shadow-2xs">
            <CardContent className="p-0">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary border border-border/50">
                  <Landmark className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-serif text-lg font-bold text-foreground">{r.title}</h3>
                    <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <span>{r.relevance}% Match</span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-amber-500 font-mono">
                    {r.citation} · <span className="text-muted-foreground font-sans">{r.court} ({r.year})</span>
                  </p>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{r.summary}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
                    <div className="flex flex-wrap gap-1.5">
                      {r.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[11px] font-medium border border-border/40">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10">
                      Read Full Opinion <ExternalLink className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {visible.length === 0 && (
          <Card className="border-border/70">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <BookOpen className="size-8 text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">No precedents found</p>
              <p className="text-xs text-muted-foreground">Try clearing your topic filter or adjusting your query.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
