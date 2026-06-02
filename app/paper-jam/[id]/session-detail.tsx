"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Calendar, ExternalLink, Users, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLibraryCard } from "@/hooks/use-library-card"
import { useToast } from "@/hooks/use-toast"
import type { PaperJamSession } from "@/lib/types"
import { doiToUrl } from "@/lib/doi-utils"

export default function PaperJamSessionPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { card } = useLibraryCard()
  const { toast } = useToast()
  const [session, setSession] = useState<PaperJamSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/paper-jam/sessions/${params.id}`, { cache: "no-store" })
      if (!res.ok) throw new Error("Failed")
      const json = await res.json()
      setSession(json.session ?? null)
    } catch {
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    void load()
  }, [load])

  const isJoined = session?.participants?.some((p) => p.user_id === card?.user_id)

  async function join() {
    if (!card?.user_id) {
      toast({ title: "Sign in required", description: "Get or log in with a library card first." })
      router.push("/settings?mode=login")
      return
    }
    setJoining(true)
    try {
      const res = await fetch(`/api/paper-jam/sessions/${params.id}/join`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to join")
      setSession(json.session)
      toast({ title: "You joined this Paper Jam" })
    } catch (err) {
      toast({
        title: "Could not join",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return <p className="page-container py-10 text-muted-foreground">Loading session…</p>
  }

  if (!session) {
    return (
      <div className="page-container max-w-2xl py-10">
        <p className="text-muted-foreground">Session not found.</p>
        <Button asChild className="mt-4">
          <Link href="/paper-jam">Back to Paper Jam</Link>
        </Button>
      </div>
    )
  }

  const when = session.scheduled_at
    ? new Date(session.scheduled_at).toLocaleString(undefined, {
        dateStyle: "full",
        timeStyle: "short",
      })
    : "Flexible — coordinate with participants"

  return (
    <div className="page-container max-w-3xl py-10 sm:py-12">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href="/paper-jam">
          <ArrowLeft className="mr-2 h-4 w-4" />
          All jams
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold">{session.title}</h1>
          {session.host_display_name && (
            <p className="mt-2 text-muted-foreground">Hosted by {session.host_display_name}</p>
          )}
        </div>
        <Badge variant="secondary">{session.format.replace("_", " ")}</Badge>
      </div>

      {session.description && (
        <p className="mt-6 whitespace-pre-wrap text-muted-foreground">{session.description}</p>
      )}

      <div className="mt-6 space-y-2 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {when}
        </p>
        <p className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          {session.participant_count ?? session.participants?.length ?? 0} participants
        </p>
        {session.meeting_url && (
          <p className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            <a href={session.meeting_url} target="_blank" rel="noopener noreferrer" className="underline">
              Join meeting
            </a>
          </p>
        )}
        {session.location_text && <p>{session.location_text}</p>}
      </div>

      <div className="mt-8">
        <h2 className="font-serif text-xl font-semibold">Papers</h2>
        <ul className="mt-3 space-y-3">
          {(session.papers ?? []).map((paper) => (
            <li key={paper.id} className="rounded-lg border border-border/60 p-4">
              <p className="font-medium">
                {paper.url ? (
                  <a href={paper.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
                    {paper.title}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : paper.doi ? (
                  <a href={doiToUrl(paper.doi)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
                    {paper.title}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  paper.title
                )}
              </p>
              {paper.authors && <p className="mt-1 text-sm text-muted-foreground">{paper.authors}</p>}
            </li>
          ))}
        </ul>
      </div>

      {session.participants && session.participants.length > 0 && (
        <div className="mt-8">
          <h2 className="font-serif text-xl font-semibold">Participants</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {session.participants.map((p) => (
              <li key={p.user_id}>
                <Link href={`/profile/${p.user_id}`} className="text-sm underline-offset-2 hover:underline">
                  {p.user_display_name ?? "Member"}
                  {p.role === "host" ? " (host)" : ""}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        {!isJoined ? (
          <Button onClick={() => void join()} disabled={joining}>
            {joining ? "Joining…" : "Join this jam"}
          </Button>
        ) : (
          <Button variant="secondary" disabled>
            You&apos;re in
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href={`/paper-jam/new?title=${encodeURIComponent(session.papers?.[0]?.title ?? "")}&doi=${encodeURIComponent(session.papers?.[0]?.doi ?? "")}&jam=0`}>
            Add paper to my list
          </Link>
        </Button>
      </div>
    </div>
  )
}
