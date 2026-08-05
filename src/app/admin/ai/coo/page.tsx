import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { EcosystemIcon, AlertTriangleIcon } from "@/components/icons"
import { formatEUR } from "@/lib/adminFormat"

export default async function AdminCooPage() {
  await requireAdminSession()

  // Fetch macro data for the COO
  const [activeProjects, totalLeads, mrrResult, agentActivity] = await Promise.all([
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.lead.count(),
    prisma.project.aggregate({ _sum: { monthlyAmount: true } }),
    prisma.agentActivity.findMany({ orderBy: { updatedAt: "desc" } }),
  ])

  const mrr = mrrResult._sum.monthlyAmount || 0
  const activeAgents = agentActivity.filter(a => a.status === "WORKING").length

  return (
    <div className="h-[calc(100vh-90px)] flex flex-col space-y-4 overflow-hidden">
      {/* Header Compact */}
      <div className="shrink-0 space-y-3 border-b border-white/5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">COO — Command Center · Pôle 00</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
              <EcosystemIcon className="w-6 h-6 text-violet-400" />
              <span>Pilotage Stratégique IA</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors shrink-0">
              Arrêt d&apos;Urgence
            </button>
          </div>
        </div>

        {/* KPI Ribbon Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Agents Actifs</span>
            <span className="text-base font-bold text-violet-400 tabular-nums">{activeAgents} / {agentActivity.length}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Projets Actifs</span>
            <span className="text-base font-bold text-white tabular-nums">{activeProjects}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Pipeline Acquisition</span>
            <span className="text-base font-bold text-white tabular-nums">{totalLeads} Leads</span>
          </div>
          <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">MRR Global</span>
            <span className="text-base font-bold text-emerald-400 tabular-nums">{formatEUR(mrr)}</span>
          </div>
        </div>
      </div>

      {/* Main Fit-To-Screen Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 overflow-hidden">
        {/* Left (2/3 width) - System Event Feed */}
        <div className="lg:col-span-2 flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <EcosystemIcon className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-bold text-white">Event Feed Central</h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">Live</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
              <EcosystemIcon className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-400">Flux d&apos;événements système (Bridge Purity OS en cours de connexion)</p>
            </div>
          </div>
        </div>

        {/* Right (1/3 width) - AI Agent Status */}
        <div className="flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden justify-between space-y-4">
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangleIcon className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                  État des Agents (Live)
                </h2>
              </div>
            </div>

            <div className="space-y-2">
              {agentActivity.length === 0 ? (
                <p className="text-[11px] text-zinc-500 font-mono p-4 border border-dashed border-white/5 rounded-xl bg-black/20 text-center">Aucun agent enregistré.</p>
              ) : (
                agentActivity.map(agent => (
                  <div key={agent.id} className="p-2.5 rounded-lg border border-white/5 bg-black/40">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-white">{agent.agentName}</span>
                      <span className={`w-2 h-2 rounded-full ${agent.status === "WORKING" ? "bg-emerald-400 animate-pulse" : agent.status === "ERROR" ? "bg-red-400" : "bg-zinc-600"}`} />
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate">{agent.currentTask || "En attente"}</p>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-white/5 bg-black/40 text-[10px] text-zinc-500 font-mono">
            Amir Kebiyeb (CEO) & Chief Agency AI (COO)
          </div>
        </div>
      </div>
    </div>
  )
}
