import "server-only"

import { NEXUS_SITE_URL } from "@/lib/nexus-config"
import type { NexusPapersResponse } from "@/lib/nexus-papers"

const FETCH_TIMEOUT_MS = 12_000

export async function fetchNexusPapers(params: {
  q?: string
  limit?: number
  offset?: number
  source?: string
  member?: string
  id?: string
}): Promise<NexusPapersResponse> {
  const url = new URL(`${NEXUS_SITE_URL}/api/papers`)
  if (params.id?.trim()) {
    url.searchParams.set("id", params.id.trim())
  } else {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 50)
    const offset = Math.max(params.offset ?? 0, 0)
    url.searchParams.set("limit", String(limit))
    url.searchParams.set("offset", String(offset))
    if (params.q?.trim()) url.searchParams.set("q", params.q.trim())
    if (params.source?.trim()) url.searchParams.set("source", params.source.trim())
    if (params.member?.trim()) url.searchParams.set("member", params.member.trim())
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    })
    if (!res.ok) {
      throw new Error(`Nexus papers API returned ${res.status}`)
    }
    const data = (await res.json()) as NexusPapersResponse
    const papers = data.papers ?? []
    return {
      papers,
      total: data.total ?? papers.length,
      limit: data.limit ?? papers.length,
      offset: data.offset ?? 0,
    }
  } finally {
    clearTimeout(timer)
  }
}
