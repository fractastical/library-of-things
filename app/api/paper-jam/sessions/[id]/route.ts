import { NextRequest, NextResponse } from "next/server"
import { getPaperJamSession } from "@/lib/server/paper-jam-repositories"
import { isUuid } from "@/lib/server/validate"
import { PAPER_JAM_ENABLED, nexusCorsHeaders } from "@/lib/nexus-config"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!PAPER_JAM_ENABLED) {
    return NextResponse.json({ error: "Paper Jam is not enabled" }, { status: 404 })
  }

  const { id } = await context.params
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 })
  }

  try {
    const session = await getPaperJamSession(id)
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }
    const origin = request.headers.get("origin")
    return NextResponse.json({ session }, { headers: nexusCorsHeaders(origin) })
  } catch (error) {
    console.error("[paper-jam/sessions/[id]] GET failed:", error)
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 })
  }
}
