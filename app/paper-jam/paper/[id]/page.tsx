import { notFound } from "next/navigation"
import { PAPER_JAM_ENABLED } from "@/lib/nexus-config"
import PaperDetailPage from "./paper-detail-client"

export default function Page() {
  if (!PAPER_JAM_ENABLED) notFound()
  return <PaperDetailPage />
}
