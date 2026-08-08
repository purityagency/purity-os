import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import Link from "next/link"
import { LeadsExplorer } from "../LeadsExplorer"
import { TableIcon } from "@/components/icons"

export default async function AcquisitionCRMPage() {
  await requireAdminSession()

  // Fetch all leads (or a large chunk for the CRM view)
  const allLeads = await prisma.lead.findMany({
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  })

  return (
    <div className="h-full flex flex-col p-4 lg:p-8 overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <TableIcon className="w-5 h-5 text-violet-500" />
              Base CRM de Leads
            </h1>
            <p className="text-xs text-zinc-400">
              Recherche et filtres avancés sur la base qualifiée par les agents d&apos;Acquisition.
            </p>
          </div>
        </div>
        <div className="text-xs font-mono px-3 py-1 bg-violet-500/10 text-violet-400 rounded-lg border border-violet-500/20">
          {allLeads.length} leads
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 relative bg-white/[0.02] border border-white/5 rounded-xl p-4">
        <LeadsExplorer initialLeads={allLeads} />
      </div>
    </div>
  )
}
