"use client"

import { FinanceIcon, AlertTriangleIcon } from "@/components/icons"

interface AgentActivity {
  id: string
  agentName: string
  status: string
  currentTask: string | null
  updatedAt: Date
  history: unknown
}

export function FinanceAgentFeed({ agents }: { agents: AgentActivity[] }) {
  // Récupérer le Chief
  const chief = agents.find((a) => a.agentName === "ChiefFinanceAI")
  const workers = agents.filter((a) => a.agentName !== "ChiefFinanceAI")

  return (
    <div className="flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-black/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FinanceIcon className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white tracking-tight">Terminal Finance</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400">Live</span>
        </div>
      </div>

      {/* Chief Status */}
      <div className="p-4 border-b border-white/5 bg-white/[0.01]">
        <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-3">
          Supervision (Chief)
        </h3>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 w-2 h-2 rounded-full ${chief?.status === "WORKING" ? "bg-emerald-400" : "bg-zinc-600"}`} />
          <div>
            <p className="text-xs font-bold text-white">Nathalie Coppens</p>
            <p className="text-[11px] font-mono text-emerald-400/80 mt-1">
              {chief?.currentTask || "En attente de consignes CEO..."}
            </p>
          </div>
        </div>
      </div>

      {/* Workers / Event Feed */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
        <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
          Activité Récente
        </h3>
        
        {workers.length === 0 ? (
           <div className="p-8 text-center border border-dashed border-white/5 rounded-xl bg-black/20">
             <AlertTriangleIcon className="w-6 h-6 mx-auto text-zinc-700 mb-2" />
             <p className="text-[10px] font-mono text-zinc-500">Aucun agent détecté</p>
           </div>
        ) : (
          <div className="space-y-3">
            {workers.map((agent) => (
              <div key={agent.id} className="p-3 rounded-lg bg-black/20 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">{agent.agentName}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm ${
                    agent.status === 'WORKING' ? 'bg-emerald-500/10 text-emerald-400' :
                    agent.status === 'ERROR' ? 'bg-red-500/10 text-red-400' :
                    'bg-white/5 text-zinc-400'
                  }`}>
                    {agent.status}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-zinc-400 break-words leading-relaxed">
                  {agent.currentTask || "Idle"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/5 bg-black/40 shrink-0">
        <button className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-colors">
          Scanner Trésorerie
        </button>
      </div>
    </div>
  )
}
