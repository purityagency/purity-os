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

// "Liquid Glass" Roster
const DOT: Record<AgentStatus, string> = {
  active: "bg-[#10b981]",
  error: "bg-[#ef4444]",
  idle: "bg-[#64748b]",
}
const STATUS_LABEL: Record<AgentStatus, string> = {
  active: "Actif",
  error: "Erreur",
  idle: "En attente",
}

export function AgentCommandGrid({ agents }: { agents: AgentInfo[] }) {
  const [selected, setSelected] = useState<AgentInfo | null>(null)
  const active = agents.filter((a) => a.status === "active").length

  return (
    <div className="w-full">
      <div className="flex items-end justify-between mb-5 border-b border-white/5 pb-3">
        <div>
          <h2 className="text-lg font-semibold text-[#f8fafc] tracking-tight">Roster IA</h2>
          <p className="text-[12px] font-medium text-[#94a3b8] mt-1">{agents.length} unités · Pôle Acquisition</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-medium text-[#64748b] mb-1">Déploiement</div>
          <div className="text-sm font-semibold tracking-tight text-[#10b981]">{active}/{agents.length} Actifs</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {agents.map((a) => {
          const initials = a.name.split(" ").map((p) => p[0]).join("").slice(0, 2)
          const isSel = selected?.id === a.id
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(isSel ? null : a)}
              className={`text-left relative overflow-hidden rounded-xl border transition-all duration-200 ${
                isSel 
                  ? "border-[#7c3aed] bg-[#1a1b1f] ring-1 ring-[#7c3aed]/20" 
                  : "border-white/5 bg-[#0f1014] hover:border-white/10 hover:bg-[#1a1b1f]"
              }`}
            >
              <div className="p-4 flex flex-col h-full justify-between gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${DOT[a.status]}`} />
                      <span className="text-[10px] font-medium text-[#64748b] uppercase tracking-wider">{STATUS_LABEL[a.status]}</span>
                    </div>
                    <div className="text-[14px] font-semibold text-[#f8fafc] truncate">{a.name}</div>
                    <div className="text-[12px] font-medium text-[#94a3b8] truncate">{a.role}</div>
                  </div>
                  <div className="shrink-0 w-8 h-8 rounded-full bg-[#1a1b1f] border border-white/5 flex items-center justify-center text-[10px] font-bold text-[#f8fafc]">
                    {initials}
                  </div>
                </div>

                <div className="border-t border-white/5 pt-3 flex items-baseline justify-between mt-auto">
                  <span className="text-[11px] font-medium text-[#94a3b8] truncate">{a.valueLabel}</span>
                  <span className="text-[15px] font-semibold tabular-nums tracking-tight text-[#f8fafc]">{a.value}</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="mt-6 rounded-xl border border-white/5 bg-[#0f1014] p-6 shadow-xl relative overflow-hidden">
          {/* Subtle background element */}
          <div className="absolute -right-5 -top-5 text-[80px] font-bold text-white/[0.02] select-none pointer-events-none">
            {selected.id.padStart(2, '0')}
          </div>
          
          <div className="relative z-10 flex flex-col sm:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold tracking-tight text-[#f8fafc]">{selected.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border border-white/5 ${selected.status === 'active' ? 'bg-[#10b981]/10 text-[#10b981]' : selected.status === 'error' ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-white/5 text-[#94a3b8]'}`}>
                  {STATUS_LABEL[selected.status]}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] font-medium text-[#64748b] mb-1">Rôle Principal</div>
                  <div className="text-[13px] font-medium text-[#f8fafc]">{selected.role}</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-[#64748b] mb-1">Dernière mise à jour</div>
                  <div className="text-[13px] text-[#f8fafc] tabular-nums">{selected.updatedAt || "Il y a 5 min"}</div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium text-[#64748b] mb-1">Protocole</div>
                <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-3xl">
                  {selected.description}
                </p>
              </div>
              
              {selected.lastLog && (
                <div className="p-3 bg-[#1a1b1f] rounded-lg border border-white/5 mt-4">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#64748b] mb-2">Dernier Événement</div>
                  <code className="text-xs text-[#10b981] break-words">{selected.lastLog}</code>
                </div>
              )}
            </div>

            <div className="w-full sm:w-64 shrink-0 flex flex-col gap-3 justify-center border-t sm:border-t-0 sm:border-l border-white/5 pt-5 sm:pt-0 sm:pl-6">
              <div className="text-center p-4 bg-[#1a1b1f] rounded-xl border border-white/5">
                <div className="text-[11px] font-medium text-[#64748b] mb-1">{selected.valueLabel}</div>
                <div className="text-3xl font-semibold tabular-nums tracking-tight text-[#f8fafc]">{selected.value}</div>
              </div>
              <button 
                type="button" 
                className="w-full py-2.5 rounded-lg bg-[#f8fafc] text-[#060309] text-[13px] font-semibold hover:bg-white transition-colors"
              >
                Intervention Directe
              </button>
              <button 
                type="button" 
                onClick={() => setSelected(null)}
                className="w-full py-2.5 rounded-lg bg-[#0f1014] border border-white/5 text-[#f8fafc] text-[13px] font-medium hover:bg-[#1a1b1f] transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
