"use client"

import type { ReadingQueueStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"

const STATUS_OPTIONS: { value: ReadingQueueStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "reading", label: "Reading" },
  { value: "completed", label: "Done" },
]

export function ReadingQueueStatusToggle({
  queueId,
  status,
  onUpdated,
}: {
  queueId: string
  status: ReadingQueueStatus
  onUpdated: (status: ReadingQueueStatus) => void
}) {
  async function setStatus(next: ReadingQueueStatus) {
    if (next === status) return
    const res = await fetch(`/api/paper-jam/queue/${queueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    })
    if (res.ok) onUpdated(next)
  }

  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Reading status">
      {STATUS_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          size="sm"
          variant={status === opt.value ? "default" : "outline"}
          onClick={() => void setStatus(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  )
}
