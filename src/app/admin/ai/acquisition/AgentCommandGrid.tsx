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

// Thème clair, dense, lisible. Un accent indigo, statuts sémantiques.
const DOT: Record<AgentStatus, string> = {
  active: "bg-[#059669]",
  error: "bg-[#dc2626]",
  idle: "bg-[#c2c6cf]",
}
const STATUS_LABEL: Record<AgentStatus, string> = {
  active: "actif",
  error: "erreur",
  idle: "en veille",
}

export function AgentCommandGrid({ agents }: { agents: AgentInfo[] }) {
  const [selected, setSelected] = useState<AgentInfo | null>(null)
  const active = agents.filter((a) => a.status === "active").length

  return (
    <div className="rounded-xl border border-[#e6e7eb] bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#8a909c]">Équipe IA · 10 agents</span>
        <span className="text-[11px] font-medium text-[#5b616e] tabular-nums">{active}/10 actifs aujourd&apos;hui</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {agents.map((a) => {
          const initials = a.name.split(" ").map((p) => p[0]).join("").slice(0, 2)
          const isSel = selected?.id === a.id
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(isSel ? null : a)}
              className={`text-left rounded-lg border p-3 transition-colors ${isSel ? "border-[#4f46e5] bg-[#f7f7ff]" : "border-[#e6e7eb] bg-white hover:border-[#c9ccd4] hover:bg-[#fafbfc]"}`}
            >
              <div className="flex items-center gap-2">
                <div className="relative w-8 h-8 rounded-lg bg-[#f0f1f4] grid place-items-center text-[11px] font-semibold text-[#3a3f4a] shrink-0">
                  {initials}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${DOT[a.status]}`} title={STATUS_LABEL[a.status]} />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[#17171a] truncate">{a.name}</div>
                  <div className="text-[11px] text-[#8a909c] truncate">{a.role}</div>
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-[#eceef2] flex items-baseline justify-between">
                <span className="text-[10px] text-[#8a909c] truncate">{a.valueLabel}</span>
                <span className="text-base font-bold tabular-nums text-[#17171a]">{a.value}</span>
              </div>
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="mt-3 rounded-lg border border-[#4f46e5]/30 bg-[#f7f7ff] p-4 text-sm">
          <div className="flex items-center justify-between gap-2 border-b border-[#e6e7eb] pb-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-[#17171a]">{selected.name}</span>
              <span className="text-[#5b616e] text-[13px] truncate">· {selected.persona}</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white text-[#5b616e] border border-[#e6e7eb]">{STATUS_LABEL[selected.status]}</span>
            </div>
            <button onClick={() => setSelected(null)} className="text-[#8a909c] hover:text-[#17171a] text-xs px-2 py-1 shrink-0">✕</button>
          </div>
          <p className="text-[#3a3f4a] leading-relaxed">{selected.description}</p>
          {selected.lastLog && (
            <div className="mt-2.5 text-[12px] text-[#5b616e] bg-white border border-[#e6e7eb] rounded-lg p-2.5">
              <span className="text-[#4f46e5] font-semibold">Dernière action : </span>{selected.lastLog.replace(/^\[[^\]]+\]\s*/, "")}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
