import { NextRequest, NextResponse } from "next/server"
import { PAPER_JAM_ENABLED } from "@/lib/nexus-config"
import { fetchNexusPapers } from "@/lib/server/nexus-papers-client"

/** Proxy to Bioelectricity Nexus papers feed for in-app browse/search. */
export async function GET(request: NextRequest) {
  if (!PAPER_JAM_ENABLED) {
    return NextResponse.json({ error: "Paper Jam is not enabled" }, { status: 404 })
  }

  const { searchParams } = request.nextUrl
  const q = searchParams.get("q") ?? undefined
  const source = searchParams.get("source") ?? undefined
  const member = searchParams.get("member") ?? undefined
  const id = searchParams.get("id") ?? undefined
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 20
  const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0

  try {
    const data = await fetchNexusPapers({ q, source, member, id, limit, offset })
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=60" },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[paper-jam/nexus/papers] fetch failed:", message)
    return NextResponse.json(
      { error: "Could not load papers from Bioelectricity Nexus" },
      { status: 502 }
    )
  }
}
