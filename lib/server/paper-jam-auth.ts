import "server-only"

import { NextRequest } from "next/server"
import { getSessionUserId } from "@/lib/server/session"
import { timingSafeEqual } from "crypto"

/** Resolve user id from library-card session or IDL sync bearer token (CLI). */
export async function resolvePaperJamUserId(request: NextRequest): Promise<string | null> {
  const sessionUserId = await getSessionUserId()
  if (sessionUserId) return sessionUserId

  const syncSecret = process.env.PAPER_JAM_IDL_SYNC_SECRET?.trim()
  const syncUserId = process.env.PAPER_JAM_IDL_SYNC_USER_ID?.trim()
  if (!syncSecret || !syncUserId) return null

  const auth = request.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) return null
  const token = auth.slice("Bearer ".length)

  try {
    const a = Buffer.from(token)
    const b = Buffer.from(syncSecret)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }

  return syncUserId
}
