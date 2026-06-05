"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Calendar, CalendarPlus, ExternalLink, Pencil, Users, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useLibraryCard } from "@/hooks/use-library-card"
import { useToast } from "@/hooks/use-toast"
import type { PaperJamFormat, PaperJamSession } from "@/lib/types"
import { doiToUrl } from "@/lib/doi-utils"

function toDatetimeLocal(iso?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function PaperJamSessionPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { card } = useLibraryCard()
  const { toast } = useToast()
  const [session, setSession] = useState<PaperJamSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editScheduledAt, setEditScheduledAt] = useState("")
  const [editFormat, setEditFormat] = useState<PaperJamFormat>("virtual")
  const [editMeetingUrl, setEditMeetingUrl] = useState("")
  const [editLocationText, setEditLocationText] = useState("")

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

  useEffect(() => {
    if (!session) return
    setEditTitle(session.title)
    setEditDescription(session.description ?? "")
    setEditScheduledAt(toDatetimeLocal(session.scheduled_at))
    setEditFormat(session.format)
    setEditMeetingUrl(session.meeting_url ?? "")
    setEditLocationText(session.location_text ?? "")
  }, [session])

  const isHost = session?.host_user_id === card?.user_id
  const isJoined = session?.participants?.some((p) => p.user_id === card?.user_id)
  const isOpen = session?.status === "open" || session?.status === "scheduled"

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

  async function saveEdits() {
    setSaving(true)
    try {
      const res = await fetch(`/api/paper-jam/sessions/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          scheduled_at: editScheduledAt || null,
          format: editFormat,
          meeting_url: editMeetingUrl.trim() || null,
          location_text: editLocationText.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save")
      setSession(json.session)
      setEditing(false)
      toast({ title: "Session updated" })
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function setSessionStatus(status: "cancelled" | "completed") {
    setSaving(true)
    try {
      const res = await fetch(`/api/paper-jam/sessions/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      setSession(json.session)
      toast({ title: status === "cancelled" ? "Jam cancelled" : "Jam marked complete" })
    } catch (err) {
      toast({
        title: "Could not update",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
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
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{session.format.replace("_", " ")}</Badge>
          {!isOpen && (
            <Badge variant="outline">{session.status}</Badge>
          )}
        </div>
      </div>

      {session.description && !editing && (
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

      <div className="mt-6">
        <Button variant="outline" size="sm" asChild>
          <a href={`/api/paper-jam/sessions/${session.id}/calendar`} download>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Add to calendar (.ics)
          </a>
        </Button>
      </div>

      {isHost && isOpen && (
        <div className="mt-8 rounded-lg border border-border/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-semibold">Host controls</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing((v) => !v)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {editing ? "Cancel edit" : "Edit session"}
            </Button>
          </div>

          {editing && (
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                void saveEdits()
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="editTitle">Title</Label>
                <Input id="editTitle" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="editScheduledAt">When</Label>
                  <Input
                    id="editScheduledAt"
                    type="datetime-local"
                    value={editScheduledAt}
                    onChange={(e) => setEditScheduledAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={editFormat} onValueChange={(v) => setEditFormat(v as PaperJamFormat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="virtual">Virtual</SelectItem>
                      <SelectItem value="in_person">In person</SelectItem>
                      <SelectItem value="async">Async</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editMeetingUrl">Meeting link</Label>
                <Input id="editMeetingUrl" value={editMeetingUrl} onChange={(e) => setEditMeetingUrl(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLocationText">Location</Label>
                <Input id="editLocationText" value={editLocationText} onChange={(e) => setEditLocationText(e.target.value)} />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </form>
          )}

          {!editing && (
            <div className="mt-4 flex flex-wrap gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={saving}>
                    Mark complete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mark this jam complete?</AlertDialogTitle>
                    <AlertDialogDescription>
                      It will no longer appear in upcoming jams. Participants can still view this page.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Back</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void setSessionStatus("completed")}>
                      Mark complete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={saving}>
                    Cancel jam
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this Paper Jam?</AlertDialogTitle>
                    <AlertDialogDescription>
                      New participants won&apos;t be able to join. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep jam</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void setSessionStatus("cancelled")}>
                      Cancel jam
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        <h2 className="font-serif text-xl font-semibold">Papers</h2>
        <ul className="mt-3 space-y-3">
          {(session.papers ?? []).map((paper) => (
            <li key={paper.id} className="rounded-lg border border-border/60 p-4">
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
        {isOpen && (
          <>
            {!isJoined ? (
              <Button onClick={() => void join()} disabled={joining}>
                {joining ? "Joining…" : "Join this jam"}
              </Button>
            ) : (
              <Button variant="secondary" disabled>
                You&apos;re in
              </Button>
            )}
          </>
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
