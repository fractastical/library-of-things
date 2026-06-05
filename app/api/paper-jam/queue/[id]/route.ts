import { NextRequest, NextResponse } from "next/server"
import { updateReadingQueueStatus } from "@/lib/server/paper-jam-repositories"
import { getSessionUserId } from "@/lib/server/session"
import { parseJsonBody, isUuid } from "@/lib/server/validate"
import { PAPER_JAM_ENABLED } from "@/lib/nexus-config"
import type { ReadingQueueStatus } from "@/lib/types"

const STATUSES: ReadingQueueStatus[] = ["planned", "reading", "completed"]

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!PAPER_JAM_ENABLED) {
    return NextResponse.json({ error: "Paper Jam is not enabled" }, { status: 404 })
  }

  const sessionUserId = await getSessionUserId()
  if (!sessionUserId) {
    return NextResponse.json({ error: "Sign in with your library card" }, { status: 401 })
  }

  const { id } = await context.params
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid queue item id" }, { status: 400 })
  }

  const parsed = await parseJsonBody<{ status?: ReadingQueueStatus }>(request)
  if (!parsed.ok) return parsed.response

  const status = parsed.data.status
  if (!status || !STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "status must be planned, reading, or completed" },
      { status: 400 }
    )
  }

  try {
    const item = await updateReadingQueueStatus({
      queue_id: id,
      user_id: sessionUserId,
      status,
    })
    if (!item) {
      return NextResponse.json({ error: "Queue item not found" }, { status: 404 })
    }
    return NextResponse.json({ item })
  } catch (error) {
    console.error("[paper-jam/queue/[id]] PATCH failed:", error)
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
  }
}
