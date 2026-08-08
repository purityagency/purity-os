import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import Link from "next/link"
import { DraftComposer } from "../DraftComposer"
import { MailIcon } from "@/components/icons"

export default async function AcquisitionDraftsPage() {
  await requireAdminSession()

  // Fetch pending drafts
  const pendingDraftsRaw = await prisma.emailDraft.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: { lead: true },
    orderBy: { createdAt: "desc" }
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

  return (
    <div className="h-full flex flex-col p-4 lg:p-8 overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <MailIcon className="w-5 h-5 text-amber-500" />
              Brouillons à Valider
            </h1>
            <p className="text-xs text-zinc-400">
              Validez ou modifiez les emails générés par Manon Verhoeven (Creative Copywriter).
            </p>
          </div>
        </div>
        <div className="text-xs font-mono px-3 py-1 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
          {draftsCount} attente(s)
        </div>
      </div>

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
