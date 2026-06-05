"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { NexusPaperPicker } from "@/components/nexus-paper-picker"
import { useLibraryCard } from "@/hooks/use-library-card"
import { useToast } from "@/hooks/use-toast"
import { nexusPaperToJamFields, type NexusPaper } from "@/lib/nexus-papers"
import type { PaperJamFormat } from "@/lib/types"

export default function NewPaperJamPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { card } = useLibraryCard()
  const { toast } = useToast()
  const [mode, setMode] = useState<"queue" | "jam">("queue")
  const [submitting, setSubmitting] = useState(false)
  const [selectedNexusId, setSelectedNexusId] = useState<string | undefined>(
    searchParams.get("nexus_id") ?? undefined
  )

  const [title, setTitle] = useState(searchParams.get("title") ?? "")
  const [authors, setAuthors] = useState(searchParams.get("authors") ?? "")
  const [doi, setDoi] = useState(searchParams.get("doi") ?? "")
  const [url, setUrl] = useState(searchParams.get("url") ?? "")
  const [abstract, setAbstract] = useState(searchParams.get("abstract") ?? "")
  const [externalId, setExternalId] = useState(searchParams.get("nexus_id") ?? "")

  const [jamTitle, setJamTitle] = useState("")
  const [description, setDescription] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [format, setFormat] = useState<PaperJamFormat>("virtual")
  const [meetingUrl, setMeetingUrl] = useState("")
  const [locationText, setLocationText] = useState("")

  const applyNexusPaper = useCallback((paper: NexusPaper) => {
    const fields = nexusPaperToJamFields(paper)
    setTitle(fields.title)
    setAuthors(fields.authors ?? "")
    setDoi(fields.doi ?? "")
    setUrl(fields.url ?? "")
    setAbstract(fields.abstract ?? "")
    setExternalId(fields.external_id)
    setSelectedNexusId(paper.id)
    if (mode === "jam") {
      setJamTitle(`Jam: ${fields.title.slice(0, 80)}`)
    }
  }, [mode])

  useEffect(() => {
    if (searchParams.get("jam") === "1") setMode("jam")
  }, [searchParams])

  useEffect(() => {
    const nexusId = searchParams.get("nexus_id")
    if (!nexusId || searchParams.get("title")) return
    fetch(`/api/paper-jam/nexus/papers?id=${encodeURIComponent(nexusId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const paper = json?.papers?.[0] as NexusPaper | undefined
        if (paper) applyNexusPaper(paper)
      })
      .catch(() => {})
  }, [searchParams, applyNexusPaper])

  useEffect(() => {
    if (mode === "jam" && !jamTitle && title) {
      setJamTitle(`Jam: ${title.slice(0, 80)}`)
    }
  }, [mode, title, jamTitle])

  async function submitQueue() {
    if (!card?.user_id) {
      toast({ title: "Sign in required", description: "Get or log in with a library card first." })
      router.push("/settings?mode=generate")
      return
    }
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/paper-jam/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          authors: authors.trim() || undefined,
          doi: doi.trim() || undefined,
          url: url.trim() || undefined,
          abstract: abstract.trim() || undefined,
          external_id: externalId.trim() || undefined,
          status: "planned",
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to add paper")
      toast({ title: "Added to your reading list" })
      router.push("/paper-jam/my-queue")
    } catch (err) {
      toast({
        title: "Could not add paper",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function submitJam() {
    if (!card?.user_id) {
      toast({ title: "Sign in required", description: "Get or log in with a library card first." })
      router.push("/settings?mode=generate")
      return
    }
    if (!jamTitle.trim() || !title.trim()) {
      toast({ title: "Session and paper title required", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/paper-jam/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: jamTitle.trim(),
          description: description.trim() || undefined,
          scheduled_at: scheduledAt || undefined,
          format,
          meeting_url: meetingUrl.trim() || undefined,
          location_text: locationText.trim() || undefined,
          paper: {
            title: title.trim(),
            authors: authors.trim() || undefined,
            doi: doi.trim() || undefined,
            url: url.trim() || undefined,
            abstract: abstract.trim() || undefined,
            external_id: externalId.trim() || undefined,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create jam")
      toast({ title: "Paper Jam created" })
      router.push(`/paper-jam/${json.session.id}`)
    } catch (err) {
      toast({
        title: "Could not create jam",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-container max-w-2xl py-10 sm:py-12">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href="/paper-jam">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Paper Jam
        </Link>
      </Button>

      <h1 className="font-serif text-3xl font-semibold">Add a paper</h1>
      <p className="mt-2 text-muted-foreground">
        Pick from the Bioelectricity Nexus feed, or enter details manually below.
      </p>

      <div className="mt-6 flex gap-2">
        <Button
          type="button"
          variant={mode === "queue" ? "default" : "outline"}
          onClick={() => setMode("queue")}
        >
          Reading list only
        </Button>
        <Button
          type="button"
          variant={mode === "jam" ? "default" : "outline"}
          onClick={() => setMode("jam")}
        >
          Start a seminar jam
        </Button>
      </div>

      <div className="mt-6">
        <NexusPaperPicker selectedId={selectedNexusId} onSelect={applyNexusPaper} />
      </div>

      {selectedNexusId && title && (
        <p className="mt-4 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
          Selected: <span className="font-medium">{title}</span>
        </p>
      )}

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          void (mode === "queue" ? submitQueue() : submitJam())
        }}
      >
        <p className="text-sm font-medium text-muted-foreground">Or edit details manually</p>
        <div className="space-y-2">
          <Label htmlFor="title">Paper title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="authors">Authors</Label>
          <Input id="authors" value={authors} onChange={(e) => setAuthors(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="doi">DOI</Label>
            <Input id="doi" value={doi} onChange={(e) => setDoi(e.target.value)} placeholder="10.1234/example" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nexus_id">Nexus id</Label>
            <Input
              id="nexus_id"
              value={externalId}
              onChange={(e) => {
                setExternalId(e.target.value)
                setSelectedNexusId(e.target.value || undefined)
              }}
              readOnly={!!selectedNexusId}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="url">Paper URL</Label>
          <Input id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>

        {mode === "jam" && (
          <>
            <hr className="border-border/60" />
            <h2 className="font-serif text-xl font-semibold">Seminar details</h2>
            <div className="space-y-2">
              <Label htmlFor="jamTitle">Session title</Label>
              <Input id="jamTitle" value={jamTitle} onChange={(e) => setJamTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What should participants read beforehand? Discussion goals?"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">When (optional)</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as PaperJamFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="virtual">Virtual meeting</SelectItem>
                    <SelectItem value="in_person">In person</SelectItem>
                    <SelectItem value="async">Async thread</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meetingUrl">Meeting link</Label>
              <Input id="meetingUrl" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationText">Location / room</Label>
              <Input id="locationText" value={locationText} onChange={(e) => setLocationText(e.target.value)} />
            </div>
          </>
        )}

        <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? "Saving…" : mode === "queue" ? "Add to my reading list" : "Create Paper Jam"}
        </Button>
      </form>
    </div>
  )
}
