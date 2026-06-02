import { notFound } from "next/navigation"
import { PAPER_JAM_ENABLED } from "@/lib/nexus-config"
import PaperJamSessionPage from "./session-detail"

export default function Page() {
  if (!PAPER_JAM_ENABLED) notFound()
  return <PaperJamSessionPage />
}
