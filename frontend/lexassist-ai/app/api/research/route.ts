import { NextResponse } from "next/server"
import { researchByQuery } from "@/lib/backend"
import { proxyBackendJson } from "@/lib/backend-client"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { query?: string; topic?: string | null }

  if (!body.query?.trim()) {
    return NextResponse.json({ error: "A legal question is required." }, { status: 400 })
  }

  try {
    return NextResponse.json(await proxyBackendJson("/research", { method: "POST", body: JSON.stringify(body) }))
  } catch {
    return NextResponse.json(researchByQuery(body.query, body.topic))
  }
}
