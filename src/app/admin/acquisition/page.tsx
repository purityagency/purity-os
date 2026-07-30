import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { approveAndSendDraft, rejectDraft } from "@/actions/acquisitionActions"
import Link from "next/link"

export default async function AdminAcquisitionPage() {
  await requireAdminSession()

  // Fetch recent missions
  const missions = await prisma.mission.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      _count: {
        select: { leads: true }
      }
    }
  })

  // Fetch leads that are ready to be contacted (Drafted)
  const pendingDrafts = await prisma.emailDraft.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: {
      lead: true
    },
    orderBy: { createdAt: "desc" }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Acquisition (Pôle 01)</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Centre de contrôle de l'équipe IA. Gérez vos missions, validez les brouillons du Copywriter, et suivez les leads.
        </p>
      </div>

      {/* MISSIONS SECTION */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Missions Actives</h2>
          <button className="rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] px-4 py-2 text-sm font-medium text-white transition-colors">
            + Nouvelle Mission
          </button>
        </div>
        
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {missions.length === 0 ? (
            <p className="p-6 text-sm text-zinc-400">Aucune mission en cours. Lancez le Chief AI.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {missions.map((mission) => (
                <div key={mission.id} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div>
                    <p className="font-semibold text-white">{mission.name}</p>
                    <p className="text-sm text-zinc-400 mt-1">{mission._count.leads} Leads sourcés</p>
                  </div>
                  <div>
                    <span className={`text-[11px] px-2 py-0.5 rounded ${mission.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-zinc-300'}`}>
                      {mission.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* DRAFTS SECTION */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">Brouillons à Valider</h2>
          <p className="text-xs text-zinc-400">Emails générés par le Creative Copywriter, prêts à être envoyés.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {pendingDrafts.length === 0 ? (
            <p className="p-6 text-sm text-zinc-400">Aucun brouillon en attente.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {pendingDrafts.map((draft) => {
                const approve = approveAndSendDraft.bind(null, draft.id)
                const reject = rejectDraft.bind(null, draft.id)
                return (
                  <div key={draft.id} className="p-5 flex flex-col gap-3 hover:bg-white/5 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{draft.lead.companyName}</p>
                        <p className="text-sm text-zinc-300 mt-1">Sujet : {draft.subject}</p>
                        {!draft.lead.contactEmail && (
                          <p className="text-xs text-amber-400 mt-1">Aucun e-mail de contact — envoi impossible</p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <form action={reject}>
                          <button type="submit" className="px-3 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-[0.98]">
                            Rejeter
                          </button>
                        </form>
                        <form action={approve}>
                          <button
                            type="submit"
                            disabled={!draft.lead.contactEmail}
                            className="px-3 py-1 text-xs rounded bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
                          >
                            Valider & Envoyer
                          </button>
                        </form>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-white/10 bg-black/20 text-sm text-zinc-300 prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: draft.bodyHtml}} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
