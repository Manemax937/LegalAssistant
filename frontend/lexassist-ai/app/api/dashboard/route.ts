import { NextResponse } from "next/server"
import { cloneDocuments } from "@/lib/backend"
import { activity, severityLabel } from "@/lib/data"
import { proxyBackendJson } from "@/lib/backend-client"

export async function GET() {
  try {
    return NextResponse.json(await proxyBackendJson("/dashboard"))
  } catch {
    const documents = cloneDocuments()
    const analyzed = documents.filter((doc) => doc.status === "analyzed")

    return NextResponse.json({
      stats: {
        documentsAnalyzed: analyzed.length,
        draftsGenerated: 46,
        aiConversations: 312,
        riskFlagsOpen: analyzed.reduce((total, doc) => total + (doc.riskScore >= 66 ? 1 : 0), 0),
      },
      documents,
      activity,
      severityLabel,
    })
  }
}
