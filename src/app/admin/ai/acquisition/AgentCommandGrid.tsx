"use client"

import { useState } from "react"

export type AgentStatus = "active" | "idle" | "error"

export interface AgentInfo {
  id: string
  name: string
  role: string
  persona: string
  description: string
  value: number
  valueLabel: string
  status: AgentStatus
  lastLog?: string
  updatedAt?: string
}

// Design "Tactical HQ / Roster" - Inspiré des jeux de gestion d'équipe
const DOT: Record<AgentStatus, string> = {
  active: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  error: "text-red-500 bg-red-500/10 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.5)]",
  idle: "text-zinc-500 bg-zinc-500/10 border-zinc-800",
}
const STATUS_LABEL: Record<AgentStatus, string> = {
  active: "DÉPLOYÉ",
  error: "ERREUR",
  idle: "EN ATTENTE",
}

export function AgentCommandGrid({ agents }: { agents: AgentInfo[] }) {
  const [selected, setSelected] = useState<AgentInfo | null>(null)
  const active = agents.filter((a) => a.status === "active").length

  return (
    <div className="w-full">
      <div className="flex items-end justify-between mb-4 border-b border-zinc-800 pb-2">
        <div>
          <h2 className="text-xl font-black uppercase tracking-widest text-zinc-100">Tactical Roster</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">Acquisition Department · {agents.length} Units</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Squad Status</div>
          <div className="text-lg font-black tracking-widest text-emerald-500">[{active}/{agents.length} DÉPLOYÉS]</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {agents.map((a) => {
          const initials = a.name.split(" ").map((p) => p[0]).join("").slice(0, 2)
          const isSel = selected?.id === a.id
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(isSel ? null : a)}
              className={`text-left relative overflow-hidden rounded-md border transition-all duration-200 ${
                isSel 
                  ? "border-zinc-300 bg-zinc-900 shadow-[0_0_15px_rgba(255,255,255,0.05)] scale-[1.02]" 
                  : "border-zinc-800 bg-[#121214] hover:border-zinc-600 hover:bg-[#18181b]"
              }`}
            >
              {/* Tactical Sidebar Accent */}
              <div className={`absolute top-0 left-0 w-1 h-full ${a.status === 'error' ? 'bg-red-500' : a.status === 'active' ? 'bg-emerald-500/50' : 'bg-zinc-800'}`} />
              
              <div className="p-3 pl-4 flex flex-col h-full justify-between gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-black uppercase tracking-wider text-zinc-100 truncate">{a.name}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 truncate">{a.role}</div>
                  </div>
                  <div className="shrink-0 w-8 h-8 rounded bg-zinc-900 border border-zinc-800 grid place-items-center text-xs font-black text-zinc-400">
                    {initials}
                  </div>
                </div>

                <div>
                  <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black tracking-widest uppercase border ${DOT[a.status]} mb-2`}>
                    {a.status === 'error' && <span className="mr-1">⚠</span>}
                    {STATUS_LABEL[a.status]}
                  </div>
                  <div className="border-t border-zinc-800/50 pt-2 flex items-baseline justify-between mt-auto">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 truncate">{a.valueLabel}</span>
                    <span className="text-lg font-black tabular-nums text-zinc-100">{a.value}</span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="mt-4 rounded-md border border-zinc-700 bg-[#121214] p-5 shadow-2xl relative overflow-hidden">
          {/* Subtle background element */}
          <div className="absolute -right-10 -top-10 text-[120px] font-black text-zinc-800/20 select-none pointer-events-none">
            {selected.id.padStart(2, '0')}
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
              <div>
                <h3 className="text-xl font-black uppercase tracking-wider text-zinc-100">{selected.name}</h3>
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mt-0.5">ID: {selected.id} · {selected.persona}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-zinc-100 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded font-bold uppercase text-xs tracking-wider transition-colors">
                Fermer
              </button>
            </div>
            
            <p className="text-sm font-medium text-zinc-300 leading-relaxed max-w-3xl border-l-2 border-zinc-700 pl-3 mb-4">
              {selected.description}
            </p>
            
            {selected.lastLog && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-md p-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Dernière Action Tactique</div>
                <div className="text-xs font-mono text-emerald-400">
                  <span className="text-zinc-600 mr-2">&gt;</span>
                  {selected.lastLog.replace(/^\[[^\]]+\]\s*/, "")}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
