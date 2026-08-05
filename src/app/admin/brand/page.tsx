import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { BrandIcon, SparklesIcon, DocumentsIcon } from "@/components/icons"

export default async function AdminBrandPage() {
  await requireAdminSession()

  // Fetch recent brand campaigns
  const campaigns = await prisma.brandCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      _count: {
        select: { drafts: true }
      }
    }
  })

  // Fetch content drafts pending approval
  const pendingDrafts = await prisma.contentDraft.findMany({
    where: { status: "PENDING_GUARDIAN_APPROVAL" },
    include: { campaign: true },
    orderBy: { createdAt: "desc" }
  })

  const activeCampaignsCount = campaigns.filter(c => c.status === "ACTIVE").length

  return (
    <div className="h-[calc(100vh-90px)] flex flex-col space-y-4 overflow-hidden">
      {/* Header Compact */}
      <div className="shrink-0 space-y-3 border-b border-white/5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Brand & Influence · Pôle 02</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
              <BrandIcon className="w-6 h-6 text-violet-400" />
              <span>Studio Éditorial & Brand Guardian</span>
            </h1>
          </div>
        </div>

        {/* KPI Ribbon Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Campagnes Actives</span>
            <span className="text-base font-bold text-violet-400 tabular-nums">{activeCampaignsCount} actives</span>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Total Campagnes</span>
            <span className="text-base font-bold text-white tabular-nums">{campaigns.length}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Validations Guardian</span>
            <span className="text-base font-bold text-amber-400 tabular-nums">{pendingDrafts.length} en attente</span>
          </div>
          <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Conformité AI Act & Brand</span>
            <span className="text-base font-bold text-emerald-400 tabular-nums">100% Conforme</span>
          </div>
        </div>
      </div>

      {/* Main Content Split Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 overflow-hidden">
        {/* Left (2/3 width) - Drafts & Campaign List */}
        <div className="lg:col-span-2 flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-bold text-white">Brouillons à Valider ({pendingDrafts.length})</h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">Validation Brand Guardian</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {pendingDrafts.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
                <DocumentsIcon className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400">Aucun brouillon en attente de validation.</p>
                <p className="text-[10px] text-zinc-600 mt-1">Les contenus générés par le Brand Studio s&apos;affichent ici.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 space-y-3">
                {pendingDrafts.map((draft) => (
                  <div key={draft.id} className="p-3.5 border border-white/5 rounded-xl bg-black/30 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase">
                        {draft.platform} · {draft.format}
                      </span>
                      <div className="flex items-center gap-2">
                        <button className="px-2.5 py-1 text-xs rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
                          Rejeter
                        </button>
                        <button className="px-3 py-1 text-xs rounded-lg bg-violet-600 hover:bg-violet-700 font-semibold text-white transition-all cursor-pointer">
                          Approuver & Publier
                        </button>
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-white">{draft.campaign.name}</p>
                    <p className="text-xs text-zinc-300 font-mono bg-white/[0.02] p-2.5 rounded-lg border border-white/5 whitespace-pre-wrap">
                      {draft.postText}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right (1/3 width) - Content Pillars & Tone of Voice Guidelines */}
        <div className="flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden justify-between space-y-4">
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono mb-2">
                Piliers de Contenu Purity
              </h2>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg border border-white/5 bg-black/30">
                  <span className="font-bold text-violet-400 block">1. Cas Clients Wallons</span>
                  <span className="text-[11px] text-zinc-400">Résultats chiffrés & transformation PME.</span>
                </div>
                <div className="p-2.5 rounded-lg border border-white/5 bg-black/30">
                  <span className="font-bold text-cyan-400 block">2. Chèques Entreprises SPW</span>
                  <span className="text-[11px] text-zinc-400">Guide subventions 50% Région Wallonne.</span>
                </div>
                <div className="p-2.5 rounded-lg border border-white/5 bg-black/30">
                  <span className="font-bold text-emerald-400 block">3. Performance & SEO Local</span>
                  <span className="text-[11px] text-zinc-400">Core Web Vitals & visibilité Charleroi/Namur.</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-white/5">
              <h3 className="text-xs font-bold text-white font-mono uppercase">Ton de Voix & Identité</h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Direct, élégant, zéro blabla. Esthétique **Liquid Glass 2026**, conformité AI Act garantie sur chaque publication.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-white/5 bg-black/40 text-[10px] text-zinc-500 font-mono">
            Supervisé par le Brand Studio & Chief Brand AI
          </div>
        </div>
      </div>
    </div>
  )
}
