"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ReadingQueueStatusToggle } from "@/components/paper-jam-reading-status"
import { useLibraryCard } from "@/hooks/use-library-card"
import type { ReadingQueueItem, ReadingQueueStatus } from "@/lib/types"
import { doiToUrl } from "@/lib/doi-utils"

export default function MyReadingQueuePage() {
  const { card } = useLibraryCard()
  const [queue, setQueue] = useState<ReadingQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/paper-jam/queue", { cache: "no-store" })
      if (res.status === 401) {
        setQueue([])
        setError("Sign in with your library card to see your reading list.")
        return
      }
      if (!res.ok) throw new Error("Failed")
      const json = await res.json()
      setQueue(json.queue ?? [])
    } catch {
      setError("Could not load your reading list.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, card?.user_id])

  function updateItemStatus(queueId: string, status: ReadingQueueStatus) {
    setQueue((prev) => prev.map((item) => (item.id === queueId ? { ...item, status } : item)))
  }

  return (
    <div className="page-container max-w-3xl py-10 sm:py-12">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href="/paper-jam">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Paper Jam
        </Link>
      </Button>

      <h1 className="font-serif text-3xl font-semibold">My reading list</h1>
      <p className="mt-2 text-muted-foreground">Papers you plan to read or are reading now.</p>

      {!card?.user_id && (
        <div className="mt-6">
          <Button asChild>
            <Link href="/settings?mode=generate">Get a library card</Link>
          </Button>
        </div>
      )}

      {loading && <p className="mt-8 text-muted-foreground">Loading…</p>}
      {error && <p className="mt-8 text-destructive">{error}</p>}

      {!loading && !error && queue.length === 0 && card?.user_id && (
        <p className="mt-8 text-muted-foreground">
          Nothing queued yet.{" "}
          <Link href="/paper-jam/new" className="underline">
            Add a paper
          </Link>
          .
        </p>
      )}

      <ul className="mt-8 divide-y divide-border/60 rounded-lg border border-border/60">
        {queue.map((item) => {
          const paper = item.paper
          if (!paper) return null
          const jamParams = new URLSearchParams({
            title: paper.title,
            doi: paper.doi ?? "",
            authors: paper.authors ?? "",
            url: paper.url ?? "",
            jam: "1",
          })
          return (
            <li key={item.id} className="px-4 py-4">
              <div className="min-w-0">
                <p className="font-medium">
                  <Link href={`/paper-jam/paper/${paper.id}`} className="hover:underline">
                    {paper.title}
                  </Link>
                  {(paper.url || paper.doi) && (
                    <a
                      href={paper.url || doiToUrl(paper.doi!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex align-middle text-muted-foreground hover:text-foreground"
                      aria-label="Open paper"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </p>
                {paper.authors && (
                  <p className="mt-1 text-sm text-muted-foreground">{paper.authors}</p>
                )}
              </div>

              <div className="mt-3">
                <ReadingQueueStatusToggle
                  queueId={item.id}
                  status={item.status}
                  onUpdated={(status) => updateItemStatus(item.id, status)}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/paper-jam/paper/${paper.id}`}>See who else is reading</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/paper-jam/new?${jamParams.toString()}`}>Start a jam</Link>
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
