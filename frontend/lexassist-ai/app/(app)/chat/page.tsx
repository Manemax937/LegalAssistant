"use client"

import { useEffect, useRef, useState } from "react"
import { Scale, Send, Sparkles, FileText, User, ChevronDown, BookOpen, Download } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/page-header"
import { cn } from "@/lib/utils"
import { proxyBackendJson, downloadPdfFile } from "@/lib/backend-client"

type DocumentRecord = { id: string; name: string; status: string; type: string }
type Message = { id: number; role: "user" | "assistant"; content: string; sources?: string[] }

const suggestions = [
  "Summarize this contract in plain English",
  "What is the notice period for termination?",
  "Explain the limitation of liability clause",
  "Who are the contracting parties?",
]

function FormattedContent({ text, role }: { text: string; role: "user" | "assistant" }) {
  if (!text) return null
  if (role === "user") {
    return <div className="whitespace-pre-wrap">{text}</div>
  }

  // Pre-process text: split concatenated bullet points into separate lines
  let processed = text.replace(/([^\n])\s*(\*|\-|•)\s+\*\*/g, "$1\n- **")
  processed = processed.replace(/([^\n])\s*\#\#\#\s*/g, "$1\n\n### ")

  const lines = processed.split("\n")

  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={idx} className="h-1.5" />

        const isHeader =
          trimmed.startsWith("###") ||
          trimmed.startsWith("##") ||
          trimmed.startsWith("#") ||
          (trimmed.startsWith("**") && trimmed.endsWith("**") && !trimmed.includes("-") && trimmed.length < 50)

        const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")

        let cleanText = trimmed
        if (trimmed.startsWith("### ")) cleanText = trimmed.replace("### ", "")
        else if (trimmed.startsWith("## ")) cleanText = trimmed.replace("## ", "")
        else if (trimmed.startsWith("# ")) cleanText = trimmed.replace("# ", "")

        const renderInline = (str: string) => {
          const parts = str.split(/(\*\*.*?\*\*)/g)
          return parts.map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={i} className="font-semibold text-foreground">
                  {part.slice(2, -2)}
                </strong>
              )
            }
            return part
          })
        }

        if (isHeader) {
          return (
            <h4 key={idx} className="mt-3 mb-1 font-semibold text-base text-foreground border-b border-border/40 pb-1">
              {renderInline(cleanText)}
            </h4>
          )
        }

        if (isBullet) {
          const bulletContent = trimmed.replace(/^[-*•]\s*/, "")
          return (
            <div key={idx} className="my-1 flex items-start gap-2 pl-1">
              <span className="mt-0.5 text-primary text-base font-bold select-none">•</span>
              <div className="flex-1">{renderInline(bulletContent)}</div>
            </div>
          )
        }

        return (
          <p key={idx} className="my-1">
            {renderInline(trimmed)}
          </p>
        )
      })}
    </div>
  )
}

export default function ChatPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [activeDoc, setActiveDoc] = useState<DocumentRecord | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [typing, setTyping] = useState(false)
  const composingRef = useRef(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    proxyBackendJson<{ documents: DocumentRecord[] }>("/documents")
      .then((json) => {
        const docs = json.documents.filter((doc) => doc.status === "analyzed")
        setDocuments(docs)
        setActiveDoc(docs[0] ?? null)
      })
      .catch(() => {
        setDocuments([])
        setActiveDoc(null)
      })
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typing])

  function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || typing) return
    const userMsg: Message = { id: Date.now(), role: "user", content: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setTyping(true)

    setTimeout(() => {
      proxyBackendJson<{ answer: string; citations?: { docName: string; section: string }[] }>("/chat", {
        method: "POST",
        body: JSON.stringify({
          query: trimmed,
          documentId: activeDoc?.id,
          documentName: activeDoc?.name,
        }),
      })
        .then((response) => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              role: "assistant",
              content: response.answer,
              sources: response.citations?.map((c) => `${c.docName} · ${c.section}`),
            },
          ])
        })
        .finally(() => setTyping(false))
    }, 250)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="RAG AI Legal Assistant"
        description="Converse directly with your contract library. AI responses are strictly grounded in document text and database context."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
        <Card className="flex h-[75vh] flex-col overflow-hidden border-border/70 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/50 bg-secondary/30 px-5 py-3.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <FileText className="size-4" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Active Context:</span>
              <span className="truncate text-sm font-bold text-foreground">{activeDoc?.name ?? "All Legal Documents"}</span>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              RAG Ready
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 bg-card/60">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center py-10">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/30 text-amber-400 border border-amber-500/30 shadow-2xs">
                  <Scale className="size-7" />
                </div>
                <h3 className="mt-4 font-serif text-xl font-bold tracking-tight text-foreground">How can I assist with this contract?</h3>
                <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
                  Ask about legal obligations, indemnification clauses, termination notices, or request plain-English summaries.
                </p>
                
                <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="group flex items-center gap-2.5 rounded-xl border border-border/70 bg-card p-3.5 text-left text-xs font-medium text-foreground transition-all duration-150 hover:border-primary/50 hover:bg-secondary/60 hover:shadow-2xs"
                    >
                      <Sparkles className="size-4 shrink-0 text-amber-500 transition-transform group-hover:scale-110" />
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex gap-3.5", m.role === "user" && "flex-row-reverse")}>
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-2xs",
                        m.role === "assistant"
                          ? "bg-gradient-to-br from-amber-500/20 to-amber-600/30 text-amber-400 border-amber-500/30"
                          : "bg-secondary text-foreground border-border/60",
                      )}
                    >
                      {m.role === "assistant" ? <Scale className="size-4.5" /> : <User className="size-4.5" />}
                    </div>
                    <div className={cn("max-w-[85%]", m.role === "user" && "text-right")}>
                      <div
                        className={cn(
                          "inline-block rounded-2xl px-4.5 py-3 text-sm leading-relaxed border shadow-2xs",
                          m.role === "assistant"
                            ? "rounded-tl-xs bg-secondary/50 border-border/60 text-foreground"
                            : "rounded-tr-xs bg-primary text-primary-foreground border-primary",
                        )}
                      >
                        <FormattedContent text={m.content} role={m.role} />
                      </div>
                      {m.sources ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {m.sources.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                            >
                              <BookOpen className="size-3 text-amber-500" />
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {m.role === "assistant" ? (
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 px-2.5 text-[11px] font-semibold text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 rounded-lg border border-border/40"
                            onClick={() => downloadPdfFile(`LexAssist Procedural Document - ${activeDoc?.name ?? "Analysis"}`, m.content)}
                          >
                            <Download className="size-3 text-amber-500" /> Download PDF
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
                
                {typing ? (
                  <div className="flex gap-3.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/30 text-amber-400 border border-amber-500/30">
                      <Scale className="size-4.5" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-xs bg-secondary/60 border border-border/60 px-4 py-3">
                      <span className="size-2 animate-bounce rounded-full bg-amber-500 [animation-delay:-0.3s]" />
                      <span className="size-2 animate-bounce rounded-full bg-amber-500 [animation-delay:-0.15s]" />
                      <span className="size-2 animate-bounce rounded-full bg-amber-500" />
                    </div>
                  </div>
                ) : null}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-border/50 bg-card p-4">
            <div className="flex items-end gap-2.5">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onCompositionStart={() => (composingRef.current = true)}
                onCompositionEnd={() => (composingRef.current = false)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !composingRef.current &&
                    e.nativeEvent.keyCode !== 229
                  ) {
                    e.preventDefault()
                    send(input)
                  }
                }}
                placeholder="Ask a question about this legal document (Press Enter to send)..."
                className="max-h-32 min-h-12 resize-none text-xs bg-secondary/30 border-border/60 focus:bg-background transition-all"
                rows={1}
              />
              <Button
                size="icon"
                className="size-12 shrink-0 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                aria-label="Send message"
                onClick={() => send(input)}
                disabled={!input.trim() || typing}
              >
                <Send className="size-4.5" />
              </Button>
            </div>
            <p className="mt-2 px-1 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>LexAssist RAG Model strictly references document text and verified SQLite database context.</span>
              <span className="font-semibold text-foreground">Press Shift+Enter for newline</span>
            </p>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Document Context
            </p>
            <span className="text-[11px] font-bold text-amber-500">{documents.length} Files</span>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[70vh] pr-1">
            {documents.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setActiveDoc(d)
                  setMessages([])
                }}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-150",
                  activeDoc?.id === d.id
                    ? "border-primary bg-secondary/80 shadow-2xs font-semibold"
                    : "border-border/60 hover:bg-secondary/40 text-muted-foreground hover:text-foreground",
                )}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <FileText className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{d.name}</p>
                  <span className="mt-1 inline-block rounded bg-background border border-border/40 px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">{d.type}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
