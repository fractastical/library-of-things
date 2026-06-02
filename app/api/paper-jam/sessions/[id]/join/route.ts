import { NextRequest, NextResponse } from "next/server"
import { joinPaperJamSession, getPaperJamSession } from "@/lib/server/paper-jam-repositories"
import { getSessionUserId } from "@/lib/server/session"
import { getUserById } from "@/lib/server/repositories"
import { isUuid } from "@/lib/server/validate"
import { PAPER_JAM_ENABLED } from "@/lib/nexus-config"

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!PAPER_JAM_ENABLED) {
    return NextResponse.json({ error: "Paper Jam is not enabled" }, { status: 404 })
  }

  const { id } = await context.params
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 })
  }

  const sessionUserId = await getSessionUserId()
  if (!sessionUserId) {
    return NextResponse.json({ error: "Sign in with your library card to join" }, { status: 401 })
  }

  const existing = await getPaperJamSession(id)
  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }
  if (existing.status === "cancelled" || existing.status === "completed") {
    return NextResponse.json({ error: "This session is no longer open" }, { status: 403 })
  }

  const user = await getUserById(sessionUserId)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  try {
    await joinPaperJamSession({
      session_id: id,
      user_id: sessionUserId,
      user_display_name: user.display_name,
    })
    const session = await getPaperJamSession(id)
    return NextResponse.json({ session })
  } catch (error) {
    console.error("[paper-jam/sessions/join] failed:", error)
    return NextResponse.json({ error: "Failed to join session" }, { status: 500 })
  }
}
