import { NextRequest, NextResponse } from "next/server"
import { getPaperJamSession } from "@/lib/server/paper-jam-repositories"
import { buildPaperJamIcs } from "@/lib/server/paper-jam-ics"
import { isUuid } from "@/lib/server/validate"
import { PAPER_JAM_ENABLED } from "@/lib/nexus-config"

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
    const siteUrl = request.nextUrl.origin
    const ics = buildPaperJamIcs(session, siteUrl)
    const filename = `paper-jam-${session.id.slice(0, 8)}.ics`
    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("[paper-jam/sessions/[id]/calendar] GET failed:", error)
    return NextResponse.json({ error: "Failed to generate calendar file" }, { status: 500 })
  }
}
