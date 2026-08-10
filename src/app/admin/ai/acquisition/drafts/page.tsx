import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { DraftComposer } from "../DraftComposer"
import { BulkSendBar } from "../BulkSendBar"
import { MailIcon } from "@/components/icons"
import { PageHeader } from "@/components/acquisition/PageHeader"

export default async function AcquisitionDraftsPage() {
  await requireAdminSession()

  // Fetch pending drafts
  // File triée par score de lead décroissant : les meilleurs prospects
  // remontent en haut, on valide d'abord ce qui compte (nulls en dernier).
  const pendingDraftsRaw = await prisma.emailDraft.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: { lead: true },
    orderBy: [{ lead: { score: { sort: "desc", nulls: "last" } } }, { createdAt: "desc" }]
  })

  // Cast JSON field to satisfy TypeScript
  const pendingDrafts = pendingDraftsRaw.map((d) => ({
    ...d,
    lead: {
      ...d.lead,
      auditData: d.lead.auditData as { painPoints?: string[]; recommendedModules?: string[]; [key: string]: unknown } | null | undefined,
    },
  }))

  const draftsCount = pendingDrafts.length
  // Scores des leads (null = 0) pour piloter l'envoi groupé côté client.
  const scores = pendingDrafts.map((d) => d.lead.score ?? 0)

  return (
    <div className="h-full flex flex-col p-4 lg:p-8 overflow-hidden">
      <PageHeader
        title="Brouillons à valider"
        subtitle="Emails générés par l'agent rédacteur, prêts à envoyer ou à corriger."
        count={{ value: draftsCount, label: "en attente", tone: "amber" }}
      />

      {/* Envoi groupé sécurisé au seuil de score */}
      {draftsCount > 0 && (
        <div className="mb-4 shrink-0">
          <BulkSendBar scores={scores} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {draftsCount === 0 ? (
          <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01] flex flex-col items-center">
            <MailIcon className="w-8 h-8 text-zinc-600 mb-3" />
            <p className="text-sm font-semibold text-zinc-300">Aucun brouillon en attente de validation.</p>
            <p className="text-xs text-zinc-500 mt-1">Les nouveaux brouillons apparaîtront ici après l&apos;enrichissement de l&apos;équipe.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            {pendingDrafts.map((draft) => (
              <DraftComposer key={draft.id} draft={draft} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
