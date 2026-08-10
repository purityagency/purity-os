import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { InboxIcon } from "@/components/icons"
import { InboxClient, type InboxLead } from "./InboxClient"

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
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <InboxIcon className="w-5 h-5 text-violet-500" />
            Inbox Acquisition
          </h1>
          <p className="text-xs text-zinc-400">Leads ayant répondu à la prospection.</p>
        </div>
        <div className="text-xs font-mono px-3 py-1 bg-violet-500/10 text-violet-400 rounded-lg border border-violet-500/20">
          {leads.length} conversation(s)
        </div>
      </div>

      <InboxClient leads={leads} />
    </div>
  )
}
