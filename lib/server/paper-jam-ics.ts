import type { PaperJamSession } from "@/lib/types"

/** Escape text for iCalendar property values. */
function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
}

function formatIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

/** Build a .ics file for a Paper Jam session (default 60 min if no end time). */
export function buildPaperJamIcs(session: PaperJamSession, siteUrl: string): string {
  const start = session.scheduled_at ? new Date(session.scheduled_at) : new Date()
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const paperTitles = (session.papers ?? []).map((p) => p.title).join("; ")
  const descriptionParts = [
    session.description,
    paperTitles ? `Papers: ${paperTitles}` : "",
    `${siteUrl}/paper-jam/${session.id}`,
    session.meeting_url ? `Meeting: ${session.meeting_url}` : "",
  ].filter(Boolean)

  const location =
    session.format === "virtual"
      ? session.meeting_url || "Online"
      : session.location_text || "TBD"

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Library of Things//Paper Jam//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${session.id}@paper-jam`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART:${formatIcsUtc(start)}`,
    `DTEND:${formatIcsUtc(end)}`,
    `SUMMARY:${icsEscape(session.title)}`,
    `DESCRIPTION:${icsEscape(descriptionParts.join("\\n\\n"))}`,
    `LOCATION:${icsEscape(location)}`,
    `URL:${siteUrl}/paper-jam/${session.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
  return lines.join("\r\n") + "\r\n"
}
