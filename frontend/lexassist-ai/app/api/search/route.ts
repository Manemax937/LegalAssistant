import { NextResponse } from "next/server"
import { searchDocuments } from "@/lib/backend"
import { proxyBackendJson } from "@/lib/backend-client"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { query?: string }

  if (!body.query?.trim()) {
    return NextResponse.json({ error: "A search query is required." }, { status: 400 })
  }

  try {
    return NextResponse.json(await proxyBackendJson("/search", { method: "POST", body: JSON.stringify(body) }))
  } catch {
    return NextResponse.json({ results: searchDocuments(body.query) })
  }
}
