import { NextResponse } from "next/server"
import { buildUploadedDocument, cloneDocuments } from "@/lib/backend"
import { proxyBackendJson } from "@/lib/backend-client"

export async function GET() {
  try {
    return NextResponse.json(await proxyBackendJson<{ documents: unknown[] }>("/documents"))
  } catch {
    return NextResponse.json({ documents: cloneDocuments() })
  }
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || ""

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()

    try {
      return NextResponse.json(await proxyBackendJson("/documents", { method: "POST", body: formData }), { status: 201 })
    } catch {
      const file = formData.get("file")
      if (file instanceof File) {
        const created = buildUploadedDocument({ name: file.name, type: file.type })
        return NextResponse.json({ document: created, message: "File accepted for analysis." }, { status: 201 })
      }
    }
  }

  const body = (await request.json().catch(() => ({}))) as { name?: string; type?: string }
  const name = body.name?.trim()

  if (!name) {
    return NextResponse.json({ error: "A document name is required." }, { status: 400 })
  }

  try {
    return NextResponse.json(await proxyBackendJson("/documents", { method: "POST", body: JSON.stringify(body) }), {
      status: 201,
    })
  } catch {
    const created = buildUploadedDocument({ name, type: body.type })
    return NextResponse.json({ document: created, message: "Document queued for analysis." }, { status: 201 })
  }
}
