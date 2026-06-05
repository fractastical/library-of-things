import { NextRequest, NextResponse } from "next/server"
import {
  listReadingQueue,
  listUserActivePaperJamSessions,
} from "@/lib/server/paper-jam-repositories"
import { resolvePaperJamUserId } from "@/lib/server/paper-jam-auth"
import { PAPER_JAM_ENABLED } from "@/lib/nexus-config"
import { buildIdlExport, IDL_PAPER_JAM_CATEGORY } from "@/lib/paper-jam-idl"

/**
 * GET /api/paper-jam/idl/export — reading queue + active jams as IDL category items.
 * Auth: lot_session cookie OR Authorization: Bearer $PAPER_JAM_IDL_SYNC_SECRET (CLI sync).
 */
export async function GET(request: NextRequest) {
  if (!PAPER_JAM_ENABLED) {
    return NextResponse.json({ error: "Paper Jam is not enabled" }, { status: 404 })
  }

  const userId = await resolvePaperJamUserId(request)
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in with library card or configure PAPER_JAM_IDL_SYNC_SECRET" },
      { status: 401 }
    )
  }

  const category =
    request.nextUrl.searchParams.get("category")?.trim() || IDL_PAPER_JAM_CATEGORY

  try {
    const [queue, jams] = await Promise.all([
      listReadingQueue(userId),
      listUserActivePaperJamSessions(userId),
    ])
    const payload = buildIdlExport({ queue, jams, category })
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    console.error("[paper-jam/idl/export] failed:", error)
    return NextResponse.json({ error: "Failed to build IDL export" }, { status: 500 })
  }
}
