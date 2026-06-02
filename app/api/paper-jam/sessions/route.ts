import { NextRequest, NextResponse } from "next/server"
import { createPaperJamSession, findOrCreatePaper } from "@/lib/server/paper-jam-repositories"
import { getSessionUserId } from "@/lib/server/session"
import { getUserById } from "@/lib/server/repositories"
import { parseJsonBody, isUuid, LIMITS, clampString } from "@/lib/server/validate"
import { PAPER_JAM_ENABLED } from "@/lib/nexus-config"
import type { PaperJamFormat } from "@/lib/types"

const FORMATS: PaperJamFormat[] = ["virtual", "in_person", "async"]

export async function POST(request: NextRequest) {
  if (!PAPER_JAM_ENABLED) {
    return NextResponse.json({ error: "Paper Jam is not enabled" }, { status: 404 })
  }

  const sessionUserId = await getSessionUserId()
  if (!sessionUserId) {
    return NextResponse.json({ error: "Sign in with your library card to host a Paper Jam" }, { status: 401 })
  }

  const parsed = await parseJsonBody<Record<string, unknown>>(request)
  if (!parsed.ok) return parsed.response
  const body = parsed.data

  const title = clampString(body.title, LIMITS.title)
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  const format = body.format as PaperJamFormat
  if (!FORMATS.includes(format)) {
    return NextResponse.json({ error: "format must be virtual, in_person, or async" }, { status: 400 })
  }

  const user = await getUserById(sessionUserId)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  let paperIds: string[] = []
  if (Array.isArray(body.paper_ids)) {
    paperIds = body.paper_ids.filter((id): id is string => typeof id === "string" && isUuid(id))
  }

  if (paperIds.length === 0 && body.paper && typeof body.paper === "object") {
    const paperInput = body.paper as Record<string, unknown>
    const paperTitle = clampString(paperInput.title, LIMITS.title)
    if (!paperTitle) {
      return NextResponse.json({ error: "paper.title is required when paper_ids is empty" }, { status: 400 })
    }
    const paper = await findOrCreatePaper({
      title: paperTitle,
      doi: clampString(paperInput.doi, 128),
      external_id: clampString(paperInput.external_id, 128),
      authors: clampString(paperInput.authors, LIMITS.author),
      abstract: clampString(paperInput.abstract, LIMITS.description),
      url: clampString(paperInput.url, LIMITS.url),
      added_by_user_id: sessionUserId,
      added_by_display_name: user.display_name,
    })
    paperIds = [paper.id]
  }

  if (paperIds.length === 0) {
    return NextResponse.json({ error: "At least one paper is required" }, { status: 400 })
  }

  const scheduledAt =
    typeof body.scheduled_at === "string" && body.scheduled_at.trim()
      ? new Date(body.scheduled_at).toISOString()
      : null
  if (scheduledAt && Number.isNaN(Date.parse(scheduledAt))) {
    return NextResponse.json({ error: "scheduled_at is invalid" }, { status: 400 })
  }

  try {
    const session = await createPaperJamSession({
      title,
      description: clampString(body.description, LIMITS.description),
      host_user_id: sessionUserId,
      host_display_name: user.display_name,
      scheduled_at: scheduledAt,
      format,
      location_text: clampString(body.location_text, 500),
      meeting_url: clampString(body.meeting_url, LIMITS.url),
      paper_ids: paperIds,
    })
    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    console.error("[paper-jam/sessions] create failed:", error)
    return NextResponse.json({ error: "Failed to create Paper Jam session" }, { status: 500 })
  }
}
