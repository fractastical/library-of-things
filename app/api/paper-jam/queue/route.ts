import { NextRequest, NextResponse } from "next/server"
import {
  addToReadingQueue,
  findOrCreatePaper,
  listReadingQueue,
} from "@/lib/server/paper-jam-repositories"
import { getSessionUserId } from "@/lib/server/session"
import { getUserById } from "@/lib/server/repositories"
import { parseJsonBody, LIMITS, clampString } from "@/lib/server/validate"
import { PAPER_JAM_ENABLED } from "@/lib/nexus-config"
import type { ReadingQueueStatus } from "@/lib/types"

const STATUSES: ReadingQueueStatus[] = ["planned", "reading", "completed"]

export async function GET() {
  if (!PAPER_JAM_ENABLED) {
    return NextResponse.json({ error: "Paper Jam is not enabled" }, { status: 404 })
  }

  const sessionUserId = await getSessionUserId()
  if (!sessionUserId) {
    return NextResponse.json({ error: "Sign in with your library card" }, { status: 401 })
  }

  try {
    const queue = await listReadingQueue(sessionUserId)
    return NextResponse.json({ queue })
  } catch (error) {
    console.error("[paper-jam/queue] GET failed:", error)
    return NextResponse.json({ error: "Failed to load reading queue" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!PAPER_JAM_ENABLED) {
    return NextResponse.json({ error: "Paper Jam is not enabled" }, { status: 404 })
  }

  const sessionUserId = await getSessionUserId()
  if (!sessionUserId) {
    return NextResponse.json({ error: "Sign in with your library card" }, { status: 401 })
  }

  const parsed = await parseJsonBody<Record<string, unknown>>(request)
  if (!parsed.ok) return parsed.response
  const body = parsed.data

  const user = await getUserById(sessionUserId)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const title = clampString(body.title, LIMITS.title)
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  const status = (body.status as ReadingQueueStatus) ?? "planned"
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "status must be planned, reading, or completed" }, { status: 400 })
  }

  try {
    const paper = await findOrCreatePaper({
      title,
      doi: clampString(body.doi, 128),
      external_id: clampString(body.external_id, 128),
      authors: clampString(body.authors, LIMITS.author),
      abstract: clampString(body.abstract, LIMITS.description),
      url: clampString(body.url, LIMITS.url),
      added_by_user_id: sessionUserId,
      added_by_display_name: user.display_name,
    })
    const item = await addToReadingQueue({
      user_id: sessionUserId,
      paper_id: paper.id,
      status,
      notes: clampString(body.notes, LIMITS.notes),
    })
    return NextResponse.json({ item, paper }, { status: 201 })
  } catch (error) {
    console.error("[paper-jam/queue] POST failed:", error)
    return NextResponse.json({ error: "Failed to add to reading queue" }, { status: 500 })
  }
}
