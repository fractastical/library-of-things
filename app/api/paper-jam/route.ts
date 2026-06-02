import { NextRequest, NextResponse } from "next/server"
import {
  listPaperJamSessions,
  listPopularReadingPapers,
} from "@/lib/server/paper-jam-repositories"
import { PAPER_JAM_ENABLED, nexusCorsHeaders } from "@/lib/nexus-config"

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin")
  return new NextResponse(null, {
    status: 204,
    headers: nexusCorsHeaders(origin),
  })
}

/** Public Paper Jam feed — embeddable from Bioelectricity Nexus. */
export async function GET(request: NextRequest) {
  if (!PAPER_JAM_ENABLED) {
    return NextResponse.json({ error: "Paper Jam is not enabled" }, { status: 404 })
  }

  try {
    const [sessions, popular] = await Promise.all([
      listPaperJamSessions(),
      listPopularReadingPapers(8),
    ])
    const origin = request.headers.get("origin")
    return NextResponse.json(
      { sessions, popular_papers: popular },
      { headers: nexusCorsHeaders(origin) }
    )
  } catch (error) {
    console.error("[paper-jam] GET failed:", error)
    return NextResponse.json({ error: "Failed to load Paper Jam data" }, { status: 500 })
  }
}
