"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { BookOpen, PlusCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PaperJamSessionCard } from "@/components/paper-jam-session-card"
import { useLibraryCard } from "@/hooks/use-library-card"
import { NEXUS_SITE_URL } from "@/lib/feature-flags"
import type { Paper, PaperJamSession } from "@/lib/types"
import { doiToUrl } from "@/lib/doi-utils"

type PaperJamData = {
  sessions: PaperJamSession[]
  popular_papers: Array<Paper & { queue_count: number }>
}

export default function PaperJamHome() {
  const { card } = useLibraryCard()
  const [data, setData] = useState<PaperJamData | null>(null)
  const [queueCount, setQueueCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/paper-jam", { cache: "no-store" })
      if (!res.ok) throw new Error("Could not load Paper Jam")
      const json = (await res.json()) as PaperJamData
      setData(json)
    } catch {
      setError("Could not load Paper Jam sessions.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!card?.user_id) {
      setQueueCount(null)
      return
    }
    fetch("/api/paper-jam/queue", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setQueueCount(json?.queue?.length ?? 0))
      .catch(() => setQueueCount(null))
  }, [card?.user_id])

  return (
    <div className="min-w-0 bg-background">
      <section className="border-b border-border/60 py-10 sm:py-14">
        <div className="page-container max-w-4xl">
          <p className="text-sm text-muted-foreground">
            <a
              href={NEXUS_SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              Bioelectricity Nexus
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">Paper Jam</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground sm:text-lg">
            List papers you plan to read, find others reading the same work, and host or join
            seminars to discuss them together.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/paper-jam/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add paper or start a jam
              </Link>
            </Button>
            {card?.user_id && (
              <Button variant="outline" asChild>
                <Link href="/paper-jam/my-queue">
                  <BookOpen className="mr-2 h-4 w-4" />
                  My reading list{queueCount != null ? ` (${queueCount})` : ""}
                </Link>
              </Button>
            )}
            {!card && (
              <Button variant="outline" asChild>
                <Link href="/settings?mode=generate">Get a library card</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="py-10 sm:py-12">
        <div className="page-container max-w-5xl space-y-10">
          {loading && <p className="text-muted-foreground">Loading sessions…</p>}
          {error && (
            <div className="space-y-3">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={() => void load()}>
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && data && (
            <>
              <div>
                <h2 className="font-serif text-2xl font-semibold">Upcoming jams</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Group reads and seminars — join to collaborate before or after the session.
                </p>
                {data.sessions.length === 0 ? (
                  <p className="mt-4 text-muted-foreground">
                    No jams yet. Be the first to{" "}
                    <Link href="/paper-jam/new" className="underline">
                      propose one
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {data.sessions.map((session) => (
                      <PaperJamSessionCard key={session.id} session={session} />
                    ))}
                  </div>
                )}
              </div>

              {data.popular_papers.length > 0 && (
                <div>
                  <h2 className="font-serif text-2xl font-semibold">Popular on reading lists</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Papers others in the community plan to read or are reading now.
                  </p>
                  <ul className="mt-4 divide-y divide-border/60 rounded-lg border border-border/60">
                    {data.popular_papers.map((paper) => (
                      <li key={paper.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-medium line-clamp-2">
                            {paper.url ? (
                              <a href={paper.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                {paper.title}
                              </a>
                            ) : paper.doi ? (
                              <a href={doiToUrl(paper.doi)} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                {paper.title}
                              </a>
                            ) : (
                              paper.title
                            )}
                          </p>
                          {paper.authors && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{paper.authors}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-sm text-muted-foreground">
                          {paper.queue_count} reading
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
