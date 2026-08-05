import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { EcosystemIcon, AlertTriangleIcon, SparklesIcon } from "@/components/icons"

const KANBAN_COLUMNS = [
  { id: "IDLE",    label: "Backlog / Idle",   color: "zinc",   dot: "bg-zinc-500" },
  { id: "WORKING", label: "Running",           color: "emerald", dot: "bg-emerald-400 animate-pulse" },
  { id: "REVIEW",  label: "Review",            color: "amber",  dot: "bg-amber-400 animate-pulse" },
  { id: "ERROR",   label: "Blocked / Error",   color: "red",    dot: "bg-red-400" },
] as const

type AgentStatus = (typeof KANBAN_COLUMNS)[number]["id"]

export default async function AdminOrchestrationPage() {
  await requireAdminSession()

  const [agentActivity, systemEvents, totalAgents] = await Promise.all([
    prisma.agentActivity.findMany({ orderBy: { updatedAt: "desc" } }),
    // Pull last 40 SYSTEM events for the workflow incident trail
    prisma.event.findMany({
      where: { type: "SYSTEM" },
      take: 40,
      orderBy: { createdAt: "desc" },
    }),
    prisma.agentActivity.count(),
  ])

  const activeAgents  = agentActivity.filter(a => a.status === "WORKING").length
  const blockedAgents = agentActivity.filter(a => a.status === "ERROR").length
  const reviewAgents  = agentActivity.filter(a => a.status === "REVIEW").length

  // Group agents by Kanban column
  const grouped = KANBAN_COLUMNS.map(col => ({
    ...col,
    agents: agentActivity.filter(a => (a.status as AgentStatus) === col.id),
  }))

  return (
    <div className="h-[calc(100vh-90px)] flex flex-col space-y-4 overflow-hidden">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="shrink-0 space-y-3 border-b border-white/5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Orchestration · Control Pane
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
              <EcosystemIcon className="w-6 h-6 text-violet-400" />
              <span>Pilotage de la Flotte IA</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors shrink-0">
              Arrêt d&apos;Urgence
            </button>
            <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors shrink-0">
              + Déployer Agent
            </button>
          </div>
        </div>

        {/* KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Total Agents</span>
            <span className="text-base font-bold text-violet-400 tabular-nums">{totalAgents}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">En Exécution</span>
            <span className="text-base font-bold text-emerald-400 tabular-nums">{activeAgents}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">En Review</span>
            <span className="text-base font-bold text-amber-400 tabular-nums">{reviewAgents}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Bloqués / Erreur</span>
            <span className="text-base font-bold text-red-400 tabular-nums">{blockedAgents}</span>
          </div>
        </div>
      </div>

      {/* ── Main Grid ────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 overflow-hidden">

        {/* Left (2/3) — Agent Kanban Board */}
        <div className="lg:col-span-2 flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden">
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <SparklesIcon className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-bold text-white">Agent Kanban Board</h2>
          </div>

          {totalAgents === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-black/20 gap-3 p-8 text-center">
              <EcosystemIcon className="w-10 h-10 text-zinc-600" />
              <p className="text-sm text-zinc-400 font-medium">Aucun agent enregistré</p>
              <p className="text-xs text-zinc-600 max-w-xs">
                Les agents apparaîtront ici dès qu&apos;ils seront enregistrés dans la table{" "}
                <code className="font-mono text-violet-400">AgentActivity</code>.
              </p>
              <p className="text-[10px] font-mono text-zinc-600 mt-1">
                Lacune connue COO : Aucune tâche attribuée à ce jour.
              </p>
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-2 gap-3 overflow-y-auto pr-1">
              {grouped.map(col => (
                <div key={col.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 sticky top-0 bg-[#08040d]/80 backdrop-blur-sm pb-1 z-10">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${col.dot}`} />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      {col.label}
                    </span>
                    <span className="ml-auto text-[10px] font-mono text-zinc-600">
                      {col.agents.length}
                    </span>
                  </div>
                  {col.agents.length === 0 ? (
                    <div className="p-3 rounded-lg border border-dashed border-white/5 text-center">
                      <p className="text-[10px] text-zinc-600 font-mono">—</p>
                    </div>
                  ) : (
                    col.agents.map(agent => (
                      <div key={agent.id} className="p-2.5 rounded-lg border border-white/5 bg-black/30 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white truncate">{agent.agentName}</span>
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              agent.status === "WORKING" ? "bg-emerald-400 animate-pulse"
                              : agent.status === "ERROR"   ? "bg-red-400"
                              : agent.status === "REVIEW"  ? "bg-amber-400 animate-pulse"
                              : "bg-zinc-600"
                            }`}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-500 truncate">
                          {agent.currentTask || "En attente"}
                        </p>
                        <p className="text-[9px] text-zinc-700 font-mono">
                          MAJ {new Date(agent.updatedAt).toLocaleTimeString("fr-BE")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right (1/3) — Workflow Incident Trail */}
        <div className="flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden space-y-4">
          <div className="shrink-0 flex items-center gap-2">
            <AlertTriangleIcon className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
              Incidents Workflow
            </h2>
            <span className="ml-auto text-[9px] font-mono text-zinc-600">SYSTEM events</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {systemEvents.length === 0 ? (
              <div className="p-4 border border-dashed border-white/5 rounded-xl bg-black/20 text-center">
                <p className="text-[11px] text-zinc-500 font-mono">Aucun incident enregistré. ✓</p>
              </div>
            ) : (
              systemEvents.map(event => (
                <div
                  key={event.id}
                  className="p-2.5 rounded-lg border border-red-500/10 bg-red-500/[0.03] space-y-0.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-red-400 truncate">
                      {event.name}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-600 shrink-0 ml-2">
                      {new Date(event.createdAt).toLocaleTimeString("fr-BE")}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-2">
                    {event.summary ?? "Événement système générique"}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="p-3 rounded-lg border border-white/5 bg-black/40 text-[10px] text-zinc-500 font-mono shrink-0">
            Kernel COO · Control Pane v1.0
          </div>
        </div>

      </div>
    </div>
  )
}
