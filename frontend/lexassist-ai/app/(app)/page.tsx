"use client"

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  FileText,
  MessagesSquare,
  PenLine,
  ShieldAlert,
  Upload,
  FileSearch,
  ArrowUpRight,
  TrendingUp,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/page-header'
import { RiskBadge } from '@/components/risk-badge'
import { severityLabel } from '@/lib/data'
import { cn } from '@/lib/utils'

type DashboardPayload = {
  stats: {
    documentsAnalyzed: number
    draftsGenerated: number
    aiConversations: number
    riskFlagsOpen: number
  }
  documents: Array<{
    id: string
    name: string
    type: string
    pages: number
    uploadedAt: string
    status: string
    riskScore: number
  }>
  activity: Array<{ id: string; action?: string; title?: string; target?: string; detail?: string; time?: string; kind?: string }>
}

const quickActions = [
  { href: '/documents', label: 'Upload document', desc: 'PDF, DOCX, TXT, or scanned image', icon: Upload },
  { href: '/chat', label: 'Ask the assistant', desc: 'Chat with your documents', icon: MessagesSquare },
  { href: '/drafting', label: 'Draft a document', desc: 'NDA, contracts, notices & more', icon: PenLine },
  { href: '/risk-analysis', label: 'Run risk analysis', desc: 'Detect risky clauses instantly', icon: FileSearch },
]

const activityIcon = {
  risk: ShieldAlert,
  draft: PenLine,
  upload: Upload,
  chat: MessagesSquare,
  export: FileText,
  analysis: FileSearch,
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((json: DashboardPayload) => {
        if (active) setData(json)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const analyzed = useMemo(
    () => (data?.documents ?? []).filter((doc) => doc.status === 'analyzed'),
    [data],
  )

  const stats = [
    { label: 'Documents Analyzed', value: String(data?.stats.documentsAnalyzed ?? 0), delta: '+12 this week', icon: FileText, color: 'from-blue-500/10 to-indigo-500/20 text-indigo-500 border-indigo-500/20' },
    { label: 'Drafts Generated', value: String(data?.stats.draftsGenerated ?? 0), delta: '+8 this week', icon: PenLine, color: 'from-amber-500/10 to-orange-500/20 text-amber-500 border-amber-500/20' },
    { label: 'AI Conversations', value: String(data?.stats.aiConversations ?? 0), delta: '+37 this week', icon: MessagesSquare, color: 'from-purple-500/10 to-violet-500/20 text-purple-500 border-purple-500/20' },
    { label: 'Risk Flags Open', value: String(data?.stats.riskFlagsOpen ?? 0), delta: '4 high severity', icon: ShieldAlert, color: 'from-rose-500/10 to-red-500/20 text-rose-500 border-rose-500/20' },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        title="Legal Command Center"
        description="Real-time overview of document ingestion, RAG vector retrieval, and automated risk analysis."
      >
        <Button
          render={<Link href="/documents" />}
          nativeButton={false}
          variant="outline"
          size="sm"
          className="rounded-lg border-border/80 hover:bg-secondary shadow-2xs font-medium"
        >
          View All Documents
        </Button>
      </PageHeader>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="card-hover-lift relative overflow-hidden border-border/70 bg-card p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className={cn("flex size-10 items-center justify-center rounded-xl border bg-gradient-to-br shadow-2xs", s.color)}>
                <s.icon className="size-5" />
              </div>
              <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="size-3" />
                <span>Active</span>
              </div>
            </div>
            <p className="mt-4 font-serif text-3xl font-bold tracking-tight text-foreground">{loading ? '—' : s.value}</p>
            <p className="mt-1 text-sm font-semibold text-foreground/90">{s.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.delta}</p>
          </Card>
        ))}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => (
            <Link key={a.label} href={a.href} className="group">
              <Card className="card-hover-lift h-full border-border/70 bg-card transition-all duration-200 hover:border-primary/50 hover:bg-secondary/40 shadow-2xs">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 transition-all group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground shadow-2xs">
                    <a.icon className="size-5" />
                  </div>
                  <p className="mt-4 flex items-center justify-between font-semibold text-foreground text-base">
                    <span>{a.label}</span>
                    <ArrowUpRight className="size-4 text-muted-foreground opacity-60 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 group-hover:text-primary" />
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/70 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
            <div>
              <CardTitle className="text-lg font-bold font-serif">Recent Documents</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Ingested contracts and analyzed files</p>
            </div>
            <Button
              render={<Link href="/documents" />}
              variant="ghost"
              size="sm"
              className="gap-1 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10"
            >
              See all <ArrowRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-3">
            {(data?.documents ?? []).slice(0, 4).map((doc) => {
              const risk = severityLabel(doc.riskScore)
              return (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="flex items-center gap-4 rounded-xl border border-border/60 bg-secondary/20 p-3.5 transition-all hover:border-primary/40 hover:bg-secondary/60 hover:shadow-2xs"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{doc.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="rounded bg-secondary border border-border/50 px-1.5 py-0.2 text-[10px] font-medium text-foreground">{doc.type}</span>
                      <span>•</span>
                      <span>{doc.pages} pages</span>
                      <span>•</span>
                      <span>{doc.uploadedAt}</span>
                    </div>
                  </div>
                  {doc.status === 'processing' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">
                      <Clock className="size-3 animate-spin" /> Processing
                    </span>
                  ) : (
                    <RiskBadge severity={risk.tone} className="hidden sm:inline-flex" />
                  )}
                </Link>
              )
            })}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-2xs">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-lg font-bold font-serif">Risk Overview</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Automated risk scores per contract</p>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-4.5">
            {analyzed.slice(0, 4).map((doc) => {
              const risk = severityLabel(doc.riskScore)
              return (
                <div key={doc.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-foreground">{doc.name}</p>
                    <span className={cn(
                      "text-xs font-bold px-1.5 py-0.2 rounded border",
                      doc.riskScore >= 66 ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                      doc.riskScore >= 40 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                      "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    )}>{doc.riskScore}/100</span>
                  </div>
                  <Progress value={doc.riskScore} className="h-1.5 bg-secondary" />
                  <p className="text-[11px] font-medium text-muted-foreground">{risk.label}</p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 shadow-2xs">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-lg font-bold font-serif">Recent Audit & AI Activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <ul className="divide-y divide-border/40">
            {(data?.activity ?? []).map((item) => {
              const Icon = activityIcon[(item.kind ?? 'upload') as keyof typeof activityIcon] || FileText
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3.5 py-3 transition-colors hover:bg-secondary/20 rounded-lg px-2"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground border border-border/50">
                    <Icon className="size-4.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      <span>{item.title ?? item.action}</span>
                      <span className="text-muted-foreground font-normal"> · {item.detail ?? item.target}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">{item.time}</span>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
