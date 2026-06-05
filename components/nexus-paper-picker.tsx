"use client"

import { useCallback, useEffect, useState } from "react"
import { Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { NexusPaper, NexusPapersResponse } from "@/lib/nexus-papers"

const PAGE_SIZE = 15

export function NexusPaperPicker({
  onSelect,
  selectedId,
}: {
  onSelect: (paper: NexusPaper) => void
  selectedId?: string
}) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [source, setSource] = useState<string>("all")
  const [offset, setOffset] = useState(0)
  const [data, setData] = useState<NexusPapersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 400)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    setOffset(0)
  }, [debouncedQuery, source])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })
      if (debouncedQuery) params.set("q", debouncedQuery)
      if (source !== "all") params.set("source", source)
      const res = await fetch(`/api/paper-jam/nexus/papers?${params.toString()}`, {
        cache: "no-store",
      })
      if (!res.ok) throw new Error("Failed to load Nexus feed")
      setData(await res.json())
    } catch {
      setError("Could not load papers from Bioelectricity Nexus.")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, source, offset])

  useEffect(() => {
    void load()
  }, [load])

  const total = data?.total ?? 0
  const hasMore = offset + PAGE_SIZE < total
  const hasPrev = offset > 0

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
      <h2 className="font-serif text-lg font-semibold">Pick from Bioelectricity Nexus</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Browse the live research feed — arXiv, PubMed, and Levin network papers.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, authors, topics…"
            className="pl-9"
            aria-label="Search Nexus papers"
          />
        </div>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="arxiv">arXiv</SelectItem>
            <SelectItem value="pubmed">PubMed</SelectItem>
            <SelectItem value="levin-blog">Levin blog</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading feed…
        </p>
      )}
      {error && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <p className="mt-3 text-xs text-muted-foreground">
            {total.toLocaleString()} papers in feed
            {debouncedQuery ? ` matching “${debouncedQuery}”` : ""}
          </p>
          <ul className="mt-3 max-h-80 divide-y divide-border/60 overflow-y-auto rounded-md border border-border/60 bg-background">
            {data.papers.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                No papers found. Try a different search.
              </li>
            ) : (
              data.papers.map((paper) => (
                <li key={paper.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(paper)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                      selectedId === paper.id ? "bg-muted ring-1 ring-inset ring-border" : ""
                    }`}
                  >
                    <p className="font-medium line-clamp-2">{paper.title}</p>
                    {paper.authors && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                        {paper.authors}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {paper.source ?? "paper"}
                      {paper.matchedMemberName ? ` · ${paper.matchedMemberName}` : ""}
                      {paper.publishedDate
                        ? ` · ${new Date(paper.publishedDate).toLocaleDateString()}`
                        : ""}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
          {(hasPrev || hasMore) && (
            <div className="mt-3 flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasPrev || loading}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasMore || loading}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
