import { requireAdminSession } from "@/lib/session"
import { listInstagramDrafts, listDmDrafts } from "@/actions/socialActions"
import { SocialClient } from "./SocialClient"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const maxDuration = 300

export default async function SocialPage() {
  await requireAdminSession()
  const [drafts, dms] = await Promise.all([listInstagramDrafts(), listDmDrafts()])

  const map = (d: Awaited<ReturnType<typeof listInstagramDrafts>>[number]) => ({
    id: d.id,
    format: d.format,
    postText: d.postText,
    status: d.status,
    structured: (d.structured as Record<string, unknown> | null) ?? null,
    createdAt: d.createdAt.toISOString(),
  })

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#060309] text-[#f8fafc] p-4 lg:p-8">
      <SocialClient initialDrafts={drafts.map(map)} initialDms={dms.map(map)} />
    </div>
  )
}
