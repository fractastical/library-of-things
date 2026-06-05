import { NextRequest, NextResponse } from "next/server"
import {
  getPaperById,
  getPaperFinishedCount,
  getPaperQueueCount,
  getPaperReaders,
  listSessionsForPaper,
} from "@/lib/server/paper-jam-repositories"
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
    return NextResponse.json({ error: "Invalid paper id" }, { status: 400 })
  }

  try {
    const paper = await getPaperById(id)
    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 })
    }
    const [readers, queue_count, finished_count, sessions] = await Promise.all([
      getPaperReaders(id),
      getPaperQueueCount(id),
      getPaperFinishedCount(id),
      listSessionsForPaper(id),
    ])
    const origin = request.headers.get("origin")
    return NextResponse.json(
      { paper, readers, queue_count, finished_count, sessions },
      { headers: nexusCorsHeaders(origin) }
    )
  } catch (error) {
    console.error("[paper-jam/papers/[id]] GET failed:", error)
    return NextResponse.json({ error: "Failed to load paper" }, { status: 500 })
  }
}
