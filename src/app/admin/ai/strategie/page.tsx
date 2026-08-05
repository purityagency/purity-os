import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { OverviewIcon, GlobeIcon } from "@/components/icons"

export default async function AdminStrategiePage() {
  await requireAdminSession()

  // Base metrics
  const totalMissions = await prisma.mission.count()
  const totalLeads = await prisma.lead.count()

  // Mocked BI & strategy metrics
  const roadmapProgress = 65
  const rdProjects = 2
  const intelAlerts = 0
  const forecastAccuracy = 92

  return (
    <div className="h-[calc(100vh-90px)] flex flex-col space-y-4 overflow-hidden">
      {/* Header Compact */}
      <div className="shrink-0 space-y-3 border-b border-white/5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Stratégie & Data · Pôle 06</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
              <OverviewIcon className="w-6 h-6 text-orange-400" />
              <span>Business Intelligence & Roadmap</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors shrink-0">
              Générer Rapport BI
            </button>
          </div>
        </div>

        {/* KPI Ribbon Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-orange-500/20 bg-orange-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Roadmap Q3</span>
            <span className="text-base font-bold text-orange-400 tabular-nums">{roadmapProgress}% Complété</span>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Projets R&D</span>
            <span className="text-base font-bold text-white tabular-nums">{rdProjects} actifs</span>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Alertes Intel</span>
            <span className="text-base font-bold text-amber-400 tabular-nums">{intelAlerts}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Précision Forecast</span>
            <span className="text-base font-bold text-emerald-400 tabular-nums">{forecastAccuracy}%</span>
          </div>
        </div>
      </div>

      {/* Main Fit-To-Screen Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 overflow-hidden">
        {/* Left (2/3 width) - Business Intelligence */}
        <div className="lg:col-span-2 flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <OverviewIcon className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-bold text-white">Forecasting & Market Data</h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">{totalMissions} missions · {totalLeads} leads sourcés</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
              <OverviewIcon className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-400">Aucun modèle de forecasting complexe généré pour l&apos;instant.</p>
              <p className="text-[10px] text-zinc-600 mt-1">Le Chief Data Officer (AI) est en cours d&apos;analyse des KPIs.</p>
            </div>
          </div>
        </div>

        {/* Right (1/3 width) - Strategic Initiatives */}
        <div className="flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden justify-between space-y-4">
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <GlobeIcon className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                  Initiatives Stratégiques
                </h2>
              </div>
            </div>

            <div className="p-4 border border-dashed border-white/5 rounded-xl bg-black/20 text-center">
              <p className="text-[11px] text-zinc-500 font-mono">Aucune veille concurrentielle critique aujourd&apos;hui.</p>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-white/5 bg-black/40 text-[10px] text-zinc-500 font-mono">
            Strategic Data Agent (Strategie AI)
          </div>
        </div>
      </div>
    </div>
  )
}
