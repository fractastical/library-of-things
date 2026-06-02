/**
 * Bioelectricity Nexus integration — Paper Jam module.
 * Set NEXT_PUBLIC_PAPER_JAM_ENABLED=true to expose routes and nav.
 */

export const PAPER_JAM_ENABLED =
  process.env.NEXT_PUBLIC_PAPER_JAM_ENABLED === "true"

/** Canonical Nexus site; used for backlinks and CORS on public Paper Jam API. */
export const NEXUS_SITE_URL =
  process.env.NEXT_PUBLIC_NEXUS_SITE_URL?.replace(/\/$/, "") ||
  "https://bioelectricitynexus.com"

/** Allowed origin for cross-origin Paper Jam API reads (Nexus embed). */
export function nexusCorsHeaders(origin: string | null): Record<string, string> {
  if (!origin || origin.replace(/\/$/, "") !== NEXUS_SITE_URL) return {}
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
  }
}
