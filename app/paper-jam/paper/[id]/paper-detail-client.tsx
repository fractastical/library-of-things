"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PaperJamSessionCard } from "@/components/paper-jam-session-card"
import type { Paper, PaperJamSession } from "@/lib/types"
import { doiToUrl } from "@/lib/doi-utils"

type PaperDetail = {
  paper: Paper
  queue_count: number
  finished_count: number
  readers: Array<{
    user_id: string
    display_name: string
    status: string
    profile_public?: boolean
  }>
  sessions: PaperJamSession[]
}

function ReaderList({
  readers,
}: {
  readers: PaperDetail["readers"]
}) {
  if (readers.length === 0) return null
  return (
    <ul className="mt-3 divide-y divide-border/60 rounded-lg border border-border/60">
      {readers.map((reader) => (
        <li key={`${reader.user_id}-${reader.status}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          {reader.display_name === "Anonymous" || reader.profile_public === false ? (
            <span>{reader.display_name}</span>
          ) : (
            <Link href={`/profile/${reader.user_id}`} className="hover:underline">
              {reader.display_name}
            </Link>
          )}
          <span className="text-muted-foreground capitalize">{reader.status}</span>
        </li>
      ))}
    </ul>
  )
}

export default function PaperDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<PaperDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/paper-jam/papers/${params.id}`, { cache: "no-store" })
      if (!res.ok) throw new Error("Failed")
      setData(await res.json())
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return <p className="page-container py-10 text-muted-foreground">Loading paper…</p>
  }

  if (!data) {
    return (
      <div className="page-container max-w-2xl py-10">
        <p className="text-muted-foreground">Paper not found.</p>
        <Button asChild className="mt-4">
          <Link href="/paper-jam">Back to Paper Jam</Link>
        </Button>
      </div>
    )
  }

  const { paper, queue_count, finished_count, readers, sessions } = data
  const activeReaders = readers.filter((r) => r.status === "planned" || r.status === "reading")
  const finishedReaders = readers.filter((r) => r.status === "completed")
  const addParams = new URLSearchParams({
    title: paper.title,
    doi: paper.doi ?? "",
    authors: paper.authors ?? "",
    url: paper.url ?? "",
  })

  return (
    <div className="page-container max-w-3xl py-10 sm:py-12">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href="/paper-jam">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Paper Jam
        </Link>
      </Button>

      <h1 className="font-serif text-3xl font-semibold leading-snug">
        {paper.url ? (
          <a href={paper.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-2 hover:underline">
            {paper.title}
            <ExternalLink className="mt-1.5 h-4 w-4 shrink-0" />
          </a>
        ) : paper.doi ? (
          <a href={doiToUrl(paper.doi)} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-2 hover:underline">
            {paper.title}
            <ExternalLink className="mt-1.5 h-4 w-4 shrink-0" />
          </a>
        ) : (
          paper.title
        )}
      </h1>
      {paper.authors && <p className="mt-2 text-muted-foreground">{paper.authors}</p>}

      <p className="mt-6 text-lg">
        <span className="font-semibold text-foreground">{queue_count}</span>
        <span className="text-muted-foreground">
          {" "}
          {queue_count === 1 ? "person is" : "people are"} planning or reading this paper
        </span>
        {finished_count > 0 && (
          <span className="text-muted-foreground">
            {" "}
            · <span className="font-semibold text-foreground">{finished_count}</span> finished
          </span>
        )}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/paper-jam/new?${addParams.toString()}`}>Add to my list</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/paper-jam/new?${addParams.toString()}&jam=1`}>Start a jam</Link>
        </Button>
      </div>

      {activeReaders.length > 0 && (
        <div className="mt-10">
          <h2 className="font-serif text-xl font-semibold">Planning or reading now</h2>
          <ReaderList readers={activeReaders} />
        </div>
      )}

      {finishedReaders.length > 0 && (
        <div className="mt-10">
          <h2 className="font-serif text-xl font-semibold">Finished reading</h2>
          <ReaderList readers={finishedReaders} />
        </div>
      )}

      {sessions.length > 0 && (
        <div className="mt-10">
          <h2 className="font-serif text-xl font-semibold">Upcoming jams on this paper</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {sessions.map((session) => (
              <PaperJamSessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
