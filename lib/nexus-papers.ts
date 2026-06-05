/** Bioelectricity Nexus papers feed — matches GET /api/papers on bioelectricitynexus.com */

export type NexusPaperSource = "arxiv" | "pubmed" | "levin-blog" | string

export interface NexusPaper {
  id: string
  arxivId?: string | null
  title: string
  authors?: string | null
  abstract?: string | null
  publishedDate?: string | null
  url?: string | null
  matchedMemberName?: string | null
  discoveredAt?: string | null
  source?: NexusPaperSource | null
  externalId?: string | null
  doi?: string | null
}

export interface NexusPapersResponse {
  papers: NexusPaper[]
  total: number
  limit: number
  offset: number
}

export function nexusPaperToJamFields(paper: NexusPaper) {
  return {
    title: paper.title,
    authors: paper.authors ?? undefined,
    doi: paper.doi ?? undefined,
    url: paper.url ?? undefined,
    abstract: paper.abstract ?? undefined,
    external_id: paper.id,
  }
}
