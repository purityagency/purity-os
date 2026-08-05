import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { launchMission } from "@/actions/acquisitionActions"
import { DraftComposer } from "./DraftComposer"
import { LeadsExplorer } from "./LeadsExplorer"
import { PipelineKanban } from "./PipelineKanban"
import { MissionTracker } from "./MissionTracker"
import { AcquisitionTabs } from "./AcquisitionTabs"

export default async function AdminAcquisitionPage() {
  await requireAdminSession()

  // Fetch ALL missions with lead count + parameters
  const missions = await prisma.mission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { leads: true } }
    }
  })

  // Fetch pending drafts
  const pendingDraftsRaw = await prisma.emailDraft.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: { lead: true },
    orderBy: { createdAt: "desc" }
  })

  // Cast JSON field to satisfy TypeScript (runtime shape is identical)
  const pendingDrafts = pendingDraftsRaw.map((d) => ({
    ...d,
    lead: {
      ...d.lead,
      auditData: d.lead.auditData as { painPoints?: string[]; recommendedModules?: string[]; [key: string]: unknown } | null | undefined,
    },
  }))

  // Leads for Pipeline Kanban (all statuses, capped at 200)
  const allLeads = await prisma.lead.findMany({
    take: 200,
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  })

  // KPI Calculations (parallel)
  const [totalLeads, avgScoreResult, activeMissionsCount, contactedCount, repliedCount, meetingCount] =
    await Promise.all([
      prisma.lead.count(),
      prisma.lead.aggregate({ _avg: { score: true } }),
      prisma.mission.count({ where: { status: "ACTIVE" } }),
      prisma.lead.count({ where: { status: "CONTACTED" } }),
      prisma.lead.count({ where: { status: "REPLIED" } }),
      prisma.lead.count({ where: { status: "MEETING_BOOKED" } }),
    ])

  const avgScore = avgScoreResult._avg.score ? Math.round(avgScoreResult._avg.score) : 0
  const engagedCount = contactedCount + repliedCount + meetingCount
  const conversionRate = totalLeads > 0 ? Math.round((engagedCount / totalLeads) * 100) : 0
  const meetingRate = totalLeads > 0 ? Math.round((meetingCount / totalLeads) * 100) : 0

  const kpis = [
    {
      label: "Missions Actives",
      value: activeMissionsCount,
      color: "text-white",
      trend: null,
    },
    {
      label: "Total Leads Sourcés",
      value: totalLeads,
      color: "text-white",
      trend: null,
    },
    {
      label: "Score Qualité Moyen",
      value: `${avgScore}/100`,
      color: "text-violet-400",
      trend: avgScore >= 50 ? "up" : avgScore > 0 ? "neutral" : null,
    },
    {
      label: "Taux d'Engagement",
      value: `${conversionRate}%`,
      color: "text-emerald-400",
      trend: conversionRate >= 10 ? "up" : "neutral",
    },
    {
      label: "Brouillons en Attente",
      value: pendingDrafts.length,
      color: pendingDrafts.length > 0 ? "text-amber-400" : "text-zinc-400",
      trend: null,
    },
    {
      label: "RDV Confirmés",
      value: meetingCount,
      color: meetingCount > 0 ? "text-emerald-400" : "text-zinc-400",
      trend: meetingCount > 0 ? "up" : null,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Acquisition <span className="text-zinc-600 text-lg font-mono">(Pôle 01)</span></h1>
          <p className="mt-1 text-sm text-zinc-400">
            Pipeline IA de prospection — {totalLeads} leads · {pendingDrafts.length} brouillon{pendingDrafts.length !== 1 ? "s" : ""} en attente · {meetingCount} RDV
          </p>
        </div>
        <a
          href="/api/admin/export/leads"
          download
          className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors shrink-0"
        >
          ↓ Exporter CSV
        </a>
      </div>

      {/* KPI Ribbon — 6 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="p-4 border border-white/5 bg-white/[0.01] backdrop-blur-md rounded-xl">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block truncate">{kpi.label}</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-xl font-bold tabular-nums ${kpi.color}`}>{kpi.value}</span>
              {kpi.trend === "up" && <span className="text-emerald-400 text-xs">↑</span>}
              {kpi.trend === "neutral" && <span className="text-zinc-500 text-xs">→</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Main layout: tabs + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Tabs content (2/3) */}
        <div className="lg:col-span-2">
          <AcquisitionTabs
            pendingDrafts={pendingDrafts}
            allLeads={allLeads}
          />
        </div>

        {/* Right: Mission Tracker (1/3) */}
        <div className="space-y-6">
          <section className="border border-white/10 rounded-xl bg-white/[0.01] p-5 backdrop-blur-md">
            <h2 className="text-base font-bold text-white mb-4">Missions d&apos;Acquisition</h2>

            {/* Launch Mission Form */}
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

            {/* Mission tracker with progress bars */}
            <MissionTracker missions={missions as never} />
          </section>
        </div>
      </div>
    </div>
  )
}
