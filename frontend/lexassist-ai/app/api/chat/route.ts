import { NextResponse } from "next/server"
import { buildChatResponse } from "@/lib/backend"
import { proxyBackendJson } from "@/lib/backend-client"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    query?: string
    documentId?: string
    documentName?: string
    history?: { role: "user" | "assistant"; content: string }[]
  }

  if (!body.query?.trim()) {
    return NextResponse.json({ error: "A query is required." }, { status: 400 })
  }

  try {
    return NextResponse.json(await proxyBackendJson("/chat", { method: "POST", body: JSON.stringify(body) }))
  } catch {
    const response = buildChatResponse({
      query: body.query,
      documentId: body.documentId,
      documentName: body.documentName,
      history: body.history,
    })

    return NextResponse.json(response)
  }
}
