import type { PaperJamSession, ReadingQueueItem } from "@/lib/types"

/** Default IDL subcategory name for Paper Jam reading + seminars. */
export const IDL_PAPER_JAM_CATEGORY = "Paper Jam"

export type IdlExportItem = {
  /** Stable sync key, e.g. reading:<queueId> or jam:<sessionId> */
  ref: string
  kind: "reading" | "jam"
  task: string
  url?: string
  doi?: string
  nexus_id?: string
  status?: string
  in_progress: boolean
  completed: string | null
  created: string
}

export type IdlExportPayload = {
  category: string
  items: IdlExportItem[]
  synced_at: string
}

function formatReadingTask(item: ReadingQueueItem): string {
  const paper = item.paper
  if (!paper) return "Read: (unknown paper)"
  const authors = paper.authors ? ` — ${paper.authors.split(",").slice(0, 2).join(",")}` : ""
  return `Read: ${paper.title}${authors}`
}

function formatJamTask(session: PaperJamSession): string {
  const when = session.scheduled_at
    ? ` (${new Date(session.scheduled_at).toLocaleDateString()})`
    : ""
  return `Jam: ${session.title}${when}`
}

export function buildIdlExport(input: {
  queue: ReadingQueueItem[]
  jams: PaperJamSession[]
  category?: string
}): IdlExportPayload {
  const items: IdlExportItem[] = []

  for (const item of input.queue) {
    const paper = item.paper
    items.push({
      ref: `reading:${item.id}`,
      kind: "reading",
      task: formatReadingTask(item),
      url: paper?.url ?? (paper?.doi ? `https://doi.org/${paper.doi}` : undefined),
      doi: paper?.doi,
      nexus_id: paper?.external_id,
      status: item.status,
      in_progress: item.status === "reading",
      completed: item.status === "completed" ? item.created_at : null,
      created: item.created_at,
    })
  }

  for (const session of input.jams) {
    const paper = session.papers?.[0]
    items.push({
      ref: `jam:${session.id}`,
      kind: "jam",
      task: formatJamTask(session),
      url: paper?.url,
      doi: paper?.doi,
      nexus_id: paper?.external_id,
      status: session.status,
      in_progress: false,
      completed: null,
      created: session.created_at,
    })
  }

  return {
    category: input.category ?? IDL_PAPER_JAM_CATEGORY,
    items,
    synced_at: new Date().toISOString(),
  }
}
