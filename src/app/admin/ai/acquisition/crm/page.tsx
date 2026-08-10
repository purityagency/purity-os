import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { Suspense } from "react"
import { LeadsExplorer } from "../LeadsExplorer"
import { PageHeader } from "@/components/acquisition/PageHeader"

export default async function AcquisitionCRMPage() {
  await requireAdminSession()

  // Fetch all leads (or a large chunk for the CRM view)
  const allLeads = await prisma.lead.findMany({
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  })

  return (
    <div className="h-full flex flex-col p-4 lg:p-8 overflow-hidden">
      <PageHeader
        title="Base de leads"
        subtitle="Recherche et filtres sur tous les prospects qualifiés par les agents."
        count={{ value: allLeads.length, label: "leads", tone: "violet" }}
      />

      {/* Main Content */}
      <div className="flex-1 min-h-0 relative bg-white/[0.02] border border-white/5 rounded-xl p-4">
        <Suspense fallback={<p className="text-xs text-zinc-500 p-4">Chargement…</p>}>
          <LeadsExplorer initialLeads={allLeads} />
        </Suspense>
      </div>
    </div>
  )
}
