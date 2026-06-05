"use client"

import Link from "next/link"
import { Calendar, Users, Video, MapPin, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { PaperJamSession } from "@/lib/types"

function formatLabel(format: PaperJamSession["format"]) {
  if (format === "virtual") return "Virtual"
  if (format === "in_person") return "In person"
  return "Async / thread"
}

function formatIcon(format: PaperJamSession["format"]) {
  if (format === "virtual") return Video
  if (format === "in_person") return MapPin
  return MessageSquare
}

export function PaperJamSessionCard({ session }: { session: PaperJamSession }) {
  const Icon = formatIcon(session.format)
  const when = session.scheduled_at
    ? new Date(session.scheduled_at).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Flexible timing"

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-lg leading-snug">
            <Link href={`/paper-jam/${session.id}`} className="hover:underline">
              {session.title}
            </Link>
          </CardTitle>
          <Badge variant="secondary">{formatLabel(session.format)}</Badge>
        </div>
        {session.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{session.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0" />
          <span>{when}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 shrink-0" />
          <span>
            {session.participant_count ?? 0} joined
            {session.host_display_name ? ` · hosted by ${session.host_display_name}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" />
          <span>{session.location_text || "Online / TBD"}</span>
        </div>
        {session.papers && session.papers.length > 0 && (
          <ul className="space-y-1 border-t border-border/60 pt-3">
            {session.papers.slice(0, 3).map((paper) => (
              <li key={paper.id} className="line-clamp-1 text-foreground">
                <Link href={`/paper-jam/paper/${paper.id}`} className="hover:underline">
                  {paper.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
