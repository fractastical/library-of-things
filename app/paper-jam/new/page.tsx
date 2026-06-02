import { Suspense } from "react"
import { notFound } from "next/navigation"
import { PAPER_JAM_ENABLED } from "@/lib/nexus-config"
import NewPaperJamForm from "./new-paper-jam-form"

export default function NewPaperJamPage() {
  if (!PAPER_JAM_ENABLED) notFound()
  return (
    <Suspense fallback={<p className="page-container py-10 text-muted-foreground">Loading…</p>}>
      <NewPaperJamForm />
    </Suspense>
  )
}
