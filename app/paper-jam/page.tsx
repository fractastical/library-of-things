import { notFound } from "next/navigation"
import { PAPER_JAM_ENABLED } from "@/lib/nexus-config"
import PaperJamHome from "./paper-jam-home"

export default function PaperJamPage() {
  if (!PAPER_JAM_ENABLED) notFound()
  return <PaperJamHome />
}
