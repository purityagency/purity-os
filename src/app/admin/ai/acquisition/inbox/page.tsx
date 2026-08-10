import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { InboxClient, type InboxLead } from "./InboxClient"
import { PageHeader } from "@/components/acquisition/PageHeader"

export const dynamic = "force-dynamic"

export default async function AcquisitionInboxPage() {
  await requireAdminSession()

  // Leads ayant réellement répondu (status REPLIED, posé par le webhook d'email
  // entrant). Aucune donnée de démonstration : onglet vide = aucune réponse
  // réelle encore arrivée.
  const repliedLeads = await prisma.lead.findMany({
    where: { status: "REPLIED" },
    include: {
      mission: { select: { name: true } },
      emailDrafts: { where: { status: "SENT" }, orderBy: { updatedAt: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const leads: InboxLead[] = repliedLeads.map((l) => ({
    id: l.id,
    companyName: l.companyName,
    contactName: l.contactName || "Contact inconnu",
    contactEmail: l.contactEmail,
    missionName: l.mission?.name ?? "—",
    updatedAt: l.updatedAt.toISOString(),
    sentEmails: l.emailDrafts.map((d) => ({
      id: d.id,
      subject: d.subject,
      bodyHtml: d.bodyHtml,
      sentAt: d.updatedAt.toISOString(),
      openCount: d.openCount,
      clickCount: d.clickCount,
    })),
  }))

  return (
    <div className="h-full flex flex-col p-4 lg:p-8 overflow-hidden">
      <PageHeader
        title="Réponses"
        subtitle="Leads ayant répondu à la prospection."
        count={{ value: leads.length, label: "conversations", tone: "violet" }}
      />

      <InboxClient leads={leads} />
    </div>
  )
}
