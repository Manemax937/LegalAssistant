import { NextResponse } from "next/server"
import { getDocumentById } from "@/lib/backend"
import { proxyBackendJson } from "@/lib/backend-client"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    return NextResponse.json(await proxyBackendJson(`/documents/${id}`))
  } catch {
    const document = getDocumentById(id)

    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 })
    }

    return NextResponse.json({ document })
  }
}
