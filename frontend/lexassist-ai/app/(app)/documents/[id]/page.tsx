import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  FileText,
  Download,
  MessagesSquare,
  Check,
  X,
  ShieldAlert,
  Clock,
  Users,
  Calendar,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { RiskBadge } from '@/components/risk-badge'
import { documents, severityLabel } from '@/lib/data'

export function generateStaticParams() {
  return documents.map((d) => ({ id: d.id }))
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const doc = documents.find((d) => d.id === id)
  if (!doc) notFound()

  const risk = severityLabel(doc.riskScore)
  const meta = [
    { icon: Layers, label: 'Type', value: doc.type },
    { icon: FileText, label: 'Pages', value: `${doc.pages}` },
    { icon: Users, label: 'Parties', value: doc.parties.join(', ') },
    { icon: Calendar, label: 'Uploaded', value: doc.uploadedAt },
  ]

  return (
    <div className="mx-auto max-w-5xl">
      <Button
        render={<Link href="/documents" />}
        variant="ghost"
        size="sm"
        className="mb-4 gap-1.5 pl-2"
      >
        <ArrowLeft className="size-4" /> Back to documents
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="size-6" />
          </div>
          <div>
            <h1 className="text-balance font-serif text-2xl font-semibold leading-tight">
              {doc.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {doc.type} · {doc.pages} pages · {Math.round(doc.sizeKb)} KB
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            render={<Link href="/chat" />}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <MessagesSquare className="size-4" /> Ask AI
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="size-4" /> Export
          </Button>
        </div>
      </div>

      {doc.status === 'processing' ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Clock className="size-6" />
            </div>
            <p className="font-medium">Document is being analyzed</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              We&apos;re parsing the text, running OCR, and generating embeddings. This usually takes
              under a minute.
            </p>
            <Progress value={62} className="mt-2 h-1.5 w-56" />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                {meta.map((m) => (
                  <div key={m.label} className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                      <m.icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="truncate text-sm font-medium">{m.value}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-5 text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Risk score</p>
                <p className="mt-1 font-serif text-4xl font-semibold">{doc.riskScore}</p>
                <div className="mt-3">
                  <RiskBadge severity={risk.tone} />
                </div>
                <Progress value={doc.riskScore} className="mt-3 h-1.5 w-full" />
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="summary" className="mt-6">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="clauses">Clauses</TabsTrigger>
              <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI-generated summary</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="text-pretty leading-relaxed text-foreground/90">{doc.summary}</p>
                  <Separator />
                  <div>
                    <p className="mb-2 text-sm font-medium">Contracting parties</p>
                    <div className="flex flex-wrap gap-2">
                      {doc.parties.map((p) => (
                        <span
                          key={p}
                          className="rounded-md bg-secondary px-2.5 py-1 text-sm text-secondary-foreground"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="clauses" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Detected clauses</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {doc.clauses.map((c) => (
                    <div
                      key={c.label}
                      className="rounded-lg border border-border p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex size-6 items-center justify-center rounded-full ${
                              c.present
                                ? 'bg-chart-4/15 text-chart-4'
                                : 'bg-destructive/10 text-destructive'
                            }`}
                          >
                            {c.present ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                          </span>
                          <p className="font-medium">{c.label}</p>
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {c.present ? 'Present' : 'Missing'}
                        </span>
                      </div>
                      {c.excerpt ? (
                        <p className="mt-2 border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
                          {c.excerpt}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="risk" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="size-5 text-destructive" />
                    Risk findings
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {doc.risks.map((r) => (
                    <div key={r.title} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium leading-snug">{r.title}</p>
                        <RiskBadge severity={r.severity} />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{r.detail}</p>
                      <div className="mt-3 rounded-md bg-accent/10 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">
                          Suggested improvement
                        </p>
                        <p className="mt-1 text-sm text-foreground/90">{r.suggestion}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
