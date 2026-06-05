import { NextRequest, NextResponse } from "next/server"
import { getPaperJamSession, updatePaperJamSession } from "@/lib/server/paper-jam-repositories"
import { getSessionUserId } from "@/lib/server/session"
import { parseJsonBody, isUuid, LIMITS, clampString } from "@/lib/server/validate"
import { PAPER_JAM_ENABLED, nexusCorsHeaders } from "@/lib/nexus-config"
import type { PaperJamFormat, PaperJamSessionStatus } from "@/lib/types"

const FORMATS: PaperJamFormat[] = ["virtual", "in_person", "async"]
const HOST_STATUSES: PaperJamSessionStatus[] = ["open", "scheduled", "completed", "cancelled"]

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
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 })
  }

  const parsed = await parseJsonBody<Record<string, unknown>>(request)
  if (!parsed.ok) return parsed.response
  const body = parsed.data

  const format = body.format as PaperJamFormat | undefined
  if (format !== undefined && !FORMATS.includes(format)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 })
  }

  const status = body.status as PaperJamSessionStatus | undefined
  if (status !== undefined && !HOST_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  let scheduledAt: string | null | undefined = undefined
  if (body.scheduled_at !== undefined) {
    if (body.scheduled_at === null || body.scheduled_at === "") {
      scheduledAt = null
    } else if (typeof body.scheduled_at === "string") {
      const d = new Date(body.scheduled_at)
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid scheduled_at" }, { status: 400 })
      }
      scheduledAt = d.toISOString()
    }
  }

  try {
    const session = await updatePaperJamSession({
      session_id: id,
      host_user_id: sessionUserId,
      title: clampString(body.title, LIMITS.title),
      description:
        body.description !== undefined ? clampString(body.description, LIMITS.description) ?? null : undefined,
      scheduled_at: scheduledAt,
      format,
      location_text:
        body.location_text !== undefined ? clampString(body.location_text, 500) ?? null : undefined,
      meeting_url:
        body.meeting_url !== undefined ? clampString(body.meeting_url, LIMITS.url) ?? null : undefined,
      status,
    })
    if (!session) {
      return NextResponse.json({ error: "Session not found or you are not the host" }, { status: 403 })
    }
    return NextResponse.json({ session })
  } catch (error) {
    console.error("[paper-jam/sessions/[id]] PATCH failed:", error)
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
  }
}
