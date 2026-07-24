import { NextResponse } from "next/server"
import { analyzeDocument, cloneDocuments } from "@/lib/backend"
import { proxyBackendJson } from "@/lib/backend-client"

export async function GET() {
  try {
    return NextResponse.json(await proxyBackendJson("/risk-analysis"))
  } catch {
    return NextResponse.json({ documents: cloneDocuments().filter((doc) => doc.status === "analyzed") })
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { documentId?: string }

  const documentId = body.documentId || cloneDocuments().find((doc) => doc.status === "analyzed")?.id

  if (!documentId) {
    return NextResponse.json({ error: "A document id is required." }, { status: 400 })
  }

  try {
    return NextResponse.json(await proxyBackendJson("/risk-analysis", { method: "POST", body: JSON.stringify(body) }))
  } catch {
    const analysis = analyzeDocument(documentId)

    if (!analysis) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 })
    }

    return NextResponse.json(analysis)
  }
}
