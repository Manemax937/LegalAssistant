"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, FileText, Sparkles, ArrowUpRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"
import { searchCorpus, searchSuggestions, type SearchPassage } from "@/lib/data"
import { proxyBackendJson } from "@/lib/backend-client"

function rank(query: string): SearchPassage[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
  if (terms.length === 0) return []

  return searchCorpus
    .map((p) => {
      const haystack = `${p.clause} ${p.excerpt}`.toLowerCase()
      let hits = 0
      terms.forEach((t) => {
        if (haystack.includes(t)) hits += 1
      })
      const base = hits / terms.length
      const score = Math.min(99, Math.round(base * 82 + (hits > 0 ? 12 : 0)))
      return { ...p, score }
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
}

function highlight(text: string, query: string) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
  if (terms.length === 0) return text
  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi")
  return text.split(pattern).map((part, i) =>
    terms.includes(part.toLowerCase()) ? (
      <mark key={i} className="rounded bg-accent/40 px-0.5 text-accent-foreground">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

export default function SearchPage() {
  const [input, setInput] = useState("")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchPassage[]>([])

  const fallback = useMemo(() => rank(query), [query])
  const visibleResults = results.length > 0 ? results : fallback

  function submit(q: string) {
    setInput(q)
    setQuery(q)
    proxyBackendJson<{ results: SearchPassage[] }>("/search", {
      method: "POST",
      body: JSON.stringify({ query: q }),
    })
      .then((json) => setResults(json.results))
      .catch(() => setResults([]))
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title="Semantic Clause & Passage Search"
        description="Search across every contract provision, indemnification clause, and agreement term using RAG semantic matching."
      />

      <Card className="border-border/70 shadow-2xs">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  submit(input)
                }
              }}
              placeholder="e.g. What are the early termination penalties or confidentiality exclusions?"
              aria-label="Semantic search query"
              className="h-12 pl-12 pr-24 text-sm bg-secondary/30 border-border/60 focus:bg-background transition-all"
            />
            <Button
              onClick={() => submit(input)}
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3.5 rounded-lg text-xs font-semibold"
            >
              Search
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suggested Searches:</span>
            {searchSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
              >
                🔍 {s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        {query === "" ? (
          <Card className="border-border/70 shadow-2xs">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-2xs">
                <Sparkles className="size-7" />
              </div>
              <p className="font-semibold text-foreground text-base">Search Your Entire Document Library</p>
              <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                Enter a natural-language question or select a suggestion above to locate specific provisions across all uploaded contracts.
              </p>
            </CardContent>
          </Card>
        ) : visibleResults.length === 0 ? (
          <Card className="border-border/70">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <p className="font-semibold text-foreground text-base">No Matching Passages Found</p>
              <p className="text-xs text-muted-foreground">
                Try rephrasing your search terms or using broader legal keywords.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Found {visibleResults.length} Relevant Passage{visibleResults.length > 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {visibleResults.map((r, i) => (
                <Card key={`${r.docId}-${i}`} className="card-hover-lift border-border/70 bg-card p-5 shadow-2xs">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <FileText className="size-4 text-amber-500" />
                        <span className="truncate">{r.docName}</span>
                        <span className="text-muted-foreground font-normal">· Page {r.page}</span>
                      </div>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {r.score}% Match
                      </span>
                    </div>

                    <h4 className="mt-3 text-base font-bold text-foreground">{r.clause}</h4>
                    <div className="mt-2 text-sm leading-relaxed text-muted-foreground bg-secondary/30 rounded-xl p-3.5 border border-border/40">
                      {highlight(r.excerpt, query)}
                    </div>

                    <div className="mt-3.5 flex justify-end">
                      <Button
                        render={<Link href="/chat" />}
                        nativeButton={false}
                        variant="ghost"
                        size="sm"
                        className="gap-1 px-3 text-xs font-semibold text-primary hover:bg-primary/10"
                      >
                        Ask AI About Passage <ArrowUpRight className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
