import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { Suspense } from "react"
import { LeadsExplorer, type LeadRow } from "../LeadsExplorer"
import { PageHeader } from "@/components/acquisition/PageHeader"
import { cleanBelgianPhone } from "@/lib/acquisition/phone"

export default async function AcquisitionCRMPage() {
  await requireAdminSession()

  const allLeads = await prisma.lead.findMany({
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    select: {
      id: true, companyName: true, contactName: true, contactEmail: true,
      location: true, status: true, score: true, websiteUrl: true, auditData: true, createdAt: true,
    },
  })

  const rows: LeadRow[] = allLeads.map((l) => ({
    id: l.id,
    companyName: l.companyName,
    contactName: l.contactName,
    contactEmail: l.contactEmail,
    location: l.location,
    status: l.status,
    score: l.score,
    hasSite: !!l.websiteUrl,
    hasPhone: cleanBelgianPhone((l.auditData as { contactPhone?: string } | null)?.contactPhone) !== null,
    createdAt: l.createdAt.toISOString(),
  }))

  return (
    <div className="h-full flex flex-col p-4 lg:p-8 overflow-hidden">
      <PageHeader
        title="Base de leads"
        subtitle="Toute la base qualifiée. Trie, filtre, ouvre une fiche."
        count={{ value: rows.length, label: "leads", tone: "violet" }}
      />
      <div className="flex-1 min-h-0">
        <Suspense fallback={<p className="text-xs text-[#737884] p-4">Chargement…</p>}>
          <LeadsExplorer initialLeads={rows} />
        </Suspense>
      </div>
    </div>
  )
}
