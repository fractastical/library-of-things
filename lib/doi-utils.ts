/** Normalize DOI to lowercase without URL prefix. */
export function normalizeDoi(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withoutUrl = trimmed
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi:/i, "")
  const doi = withoutUrl.toLowerCase()
  if (!/^10\.\d{4,9}\/\S+$/.test(doi)) return null
  return doi
}

export function doiToUrl(doi: string): string {
  return `https://doi.org/${doi}`
}
