import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"

export default async function AdminBrandPage() {
  await requireAdminSession()

  // Fetch recent brand campaigns
  const campaigns = await prisma.brandCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      _count: {
        select: { drafts: true }
      }
    }
  })

  // Fetch content drafts pending approval
  const pendingDrafts = await prisma.contentDraft.findMany({
    where: { status: "PENDING_GUARDIAN_APPROVAL" }, // ou PENDING_CEO_APPROVAL
    include: {
      campaign: true
    },
    orderBy: { createdAt: "desc" }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Brand & Authority (Pôle 02)</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Supervisez la stratégie de contenu, validez les posts et analysez les tendances générées par l'équipe Brand IA.
        </p>
      </div>

      {/* CAMPAIGNS SECTION */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Campagnes Éditoriales</h2>
          <button className="rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] px-4 py-2 text-sm font-medium text-white transition-colors">
            + Nouveau Brief Stratégique
          </button>
        </div>
        
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {campaigns.length === 0 ? (
            <p className="p-6 text-sm text-zinc-400">Aucune campagne en cours. Lancez le Chief Brand AI.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div>
                    <p className="font-semibold text-white">{campaign.name}</p>
                    <p className="text-sm text-zinc-400 mt-1">{campaign.objective} • {campaign._count.drafts} Contenus</p>
                  </div>
                  <div>
                    <span className={`text-[11px] px-2 py-0.5 rounded ${campaign.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-zinc-300'}`}>
                      {campaign.status}
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
          <h2 className="text-xl font-semibold text-white">Brouillons à Valider (Brand Guardian)</h2>
          <p className="text-xs text-zinc-400">Contenus générés par le Copywriter et le Brand Studio, en attente de votre feu vert.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {pendingDrafts.length === 0 ? (
            <p className="p-6 text-sm text-zinc-400">Aucun contenu en attente de validation.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {pendingDrafts.map((draft) => (
                <div key={draft.id} className="p-5 flex flex-col gap-3 hover:bg-white/5 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-semibold text-[#7C3AED] uppercase tracking-wider">{draft.platform} - {draft.format}</span>
                      <p className="font-semibold text-white mt-1">{draft.campaign.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-white transition-colors">
                        Rejeter
                      </button>
                      <button className="px-3 py-1 text-xs rounded bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors">
                        Approuver & Publier
                      </button>
                    </div>
                  </div>
                  
                  {/* Media Preview (Mock) */}
                  {draft.mediaUrls && (
                    <div className="w-full h-32 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-xs text-zinc-500">
                      [Aperçu Visuel / Video Liquid Glass]
                    </div>
                  )}

                  <div className="p-4 rounded-lg border border-white/10 bg-black/20 text-sm text-zinc-300 whitespace-pre-wrap font-mono">
                    {draft.postText}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
