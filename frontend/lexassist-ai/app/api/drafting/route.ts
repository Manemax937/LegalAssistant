import { NextResponse } from "next/server"
import { buildDraft } from "@/lib/backend"
import { proxyBackendJson } from "@/lib/backend-client"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    template?: string
    partyA?: string
    partyB?: string
    jurisdiction?: string
    notes?: string
  }

  if (!body.template?.trim()) {
    return NextResponse.json({ error: "A template is required." }, { status: 400 })
  }

  try {
    return NextResponse.json(await proxyBackendJson("/drafting", { method: "POST", body: JSON.stringify(body) }))
  } catch {
    return NextResponse.json(
      buildDraft({
        template: body.template,
        partyA: body.partyA,
        partyB: body.partyB,
        jurisdiction: body.jurisdiction,
        notes: body.notes,
      }),
    )
  }
}
