import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { launchMission } from "@/actions/acquisitionActions"
import { DraftComposer } from "./DraftComposer"
import { LeadsExplorer } from "./LeadsExplorer"

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

  // Fetch leads for CRM search/filters
  const scoredLeads = await prisma.lead.findMany({
    take: 100,
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  })

  // KPI Calculations
  const totalLeads = await prisma.lead.count()
  
  const avgScoreResult = await prisma.lead.aggregate({
    _avg: { score: true }
  })
  const avgScore = avgScoreResult._avg.score ? Math.round(avgScoreResult._avg.score) : 0

  const activeMissionsCount = await prisma.mission.count({
    where: { status: "ACTIVE" }
  })

  const contactedCount = await prisma.lead.count({
    where: { status: "CONTACTED" }
  })
  const conversionRate = totalLeads > 0 ? Math.round((contactedCount / totalLeads) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Acquisition (Pôle 01)</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Supervisez la prospection automatisée, personnalisez les brouillons IA et filtrez le pipeline de leads de l&apos;agence.
        </p>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border border-white/5 bg-white/[0.01] backdrop-blur-md rounded-xl">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">Missions Actives</span>
          <span className="text-2xl font-bold text-white tabular-nums mt-1 block">{activeMissionsCount}</span>
        </div>
        <div className="p-4 border border-white/5 bg-white/[0.01] backdrop-blur-md rounded-xl">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">Total Leads Sourcés</span>
          <span className="text-2xl font-bold text-white tabular-nums mt-1 block">{totalLeads}</span>
        </div>
        <div className="p-4 border border-white/5 bg-white/[0.01] backdrop-blur-md rounded-xl">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">Score de Qualité Moyen</span>
          <span className="text-2xl font-bold text-violet-400 tabular-nums mt-1 block">{avgScore}/100</span>
        </div>
        <div className="p-4 border border-white/5 bg-white/[0.01] backdrop-blur-md rounded-xl">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">Taux d&apos;Envoi (Contactés)</span>
          <span className="text-2xl font-bold text-emerald-400 tabular-nums mt-1 block">{conversionRate}%</span>
        </div>
      </div>

      {/* Main Grid: 2 Column Layout (Content / Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Drafts & CRM Explorer (2/3 width) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Brouillons Section */}
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white">Brouillons à Valider ({pendingDrafts.length})</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Cliquez sur Modifier pour ajuster la formulation ou changer de ton.</p>
            </div>

            <div className="space-y-4">
              {pendingDrafts.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                  <p className="text-sm text-zinc-400">Aucun brouillon en attente de validation.</p>
                </div>
              ) : (
                pendingDrafts.map((draft) => (
                  <DraftComposer key={draft.id} draft={draft} />
                ))
              )}
            </div>
          </section>

          {/* Leads CRM Explorer Section */}
          <section>
            <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-white">Base de Leads</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Pilotez le pipeline d&apos;acquisition qualifié par nos agents IA.</p>
              </div>
              <a
                href="/api/admin/export/leads"
                download
                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors shrink-0"
              >
                Exporter CSV
              </a>
            </div>

            <LeadsExplorer initialLeads={scoredLeads} />
          </section>

        </div>

        {/* Right Column: Active Missions (1/3 width) */}
        <div className="space-y-6">
          <section className="border border-white/10 rounded-xl bg-white/[0.01] p-5 backdrop-blur-md">
            <h2 className="text-lg font-bold text-white mb-4">Missions d&apos;Acquisition</h2>
            
            {/* Nouvelle Mission Form */}
            <details className="mb-4 rounded-lg border border-white/5 bg-black/20 overflow-hidden group">
              <summary className="cursor-pointer list-none p-3.5 flex items-center justify-between text-xs font-semibold text-white/95">
                <span>+ Lancer un Scan AI</span>
                <span className="text-zinc-500 font-mono text-[10px] group-open:hidden">ouvrir</span>
                <span className="text-zinc-500 font-mono text-[10px] hidden group-open:inline">fermer</span>
              </summary>
              <form action={launchMission} className="p-3.5 pt-0 space-y-3">
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1" htmlFor="mission-name">Nom</label>
                    <input
                      id="mission-name"
                      name="name"
                      type="text"
                      required
                      placeholder="ex: Restaurants Mons"
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1" htmlFor="mission-quota">Quota Max (1-50)</label>
                    <input
                      id="mission-quota"
                      name="maxLeads"
                      type="number"
                      min={1}
                      max={50}
                      defaultValue={10}
                      required
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1" htmlFor="mission-sectors">Secteur(s)</label>
                    <input
                      id="mission-sectors"
                      name="sectors"
                      type="text"
                      required
                      placeholder="ex: HoReCa"
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1" htmlFor="mission-locations">Ville(s)</label>
                    <input
                      id="mission-locations"
                      name="locations"
                      type="text"
                      required
                      placeholder="ex: Mons"
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-violet-600 hover:bg-violet-700 py-2 text-xs font-semibold text-white transition-all active:scale-[0.98] cursor-pointer"
                >
                  Lancer la recherche
                </button>
              </form>
            </details>

            {/* List of recent missions */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">5 Derniers Scans</span>
              
              {missions.length === 0 ? (
                <p className="text-xs text-zinc-500 py-2">Aucune mission enregistrée.</p>
              ) : (
                <div className="space-y-2">
                  {missions.map((mission) => (
                    <div key={mission.id} className="p-3 border border-white/5 rounded-lg bg-black/10 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-white">{mission.name}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{mission._count.leads} Leads sourcés</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                        mission.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-zinc-400'
                      }`}>
                        {mission.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
