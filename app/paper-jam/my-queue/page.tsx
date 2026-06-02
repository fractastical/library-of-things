import { notFound } from "next/navigation"
import { PAPER_JAM_ENABLED } from "@/lib/nexus-config"
import MyReadingQueuePage from "./my-queue-client"

export default function Page() {
  if (!PAPER_JAM_ENABLED) notFound()
  return <MyReadingQueuePage />
}
