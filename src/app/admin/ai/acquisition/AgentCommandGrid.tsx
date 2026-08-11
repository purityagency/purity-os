"use client"

import { useState } from "react"
import { SparklesIcon, UserIcon } from "@/components/icons"

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

const ACCENT = "#c4f82a"

export function AgentCommandGrid({ agents }: { agents: AgentInfo[] }) {
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null)

  const statusDot = (s: AgentStatus) => {
    switch (s) {
      case "active":
        return "bg-[#c4f82a] shadow-[0_0_8px_#c4f82a]"
      case "error":
        return "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
      default:
        return "bg-zinc-600"
    }
  }

  const statusBadgeClass = (s: AgentStatus) => {
    switch (s) {
      case "active":
        return "bg-[#c4f82a]/10 text-[#c4f82a] border-[#c4f82a]/30"
      case "error":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30"
      default:
        return "bg-zinc-800/50 text-zinc-400 border-zinc-700/40"
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-[#c4f82a]" />
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400 font-bold">
            Escouade IA · 10 Agents Spécialisés
          </h2>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">
          {agents.filter((a) => a.status === "active").length}/10 actifs · Orchestration VPS OVH
        </span>
      </div>

      {/* Grid of 10 Agents */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {agents.map((agent) => {
          const initials = agent.name
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)

          const isSelected = selectedAgent?.id === agent.id

          return (
            <div
              key={agent.name}
              onClick={() => setSelectedAgent(isSelected ? null : agent)}
              className={`group relative rounded-2xl border p-3.5 transition-all duration-300 cursor-pointer overflow-hidden ${
                isSelected
                  ? "border-[#c4f82a]/50 bg-[#19191d] shadow-[0_0_20px_rgba(196,248,42,0.1)]"
                  : "border-white/[0.07] bg-[#121214] hover:border-white/20 hover:bg-[#161619]"
              }`}
            >
              {/* Top Row: Avatar + Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="relative w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-xs font-bold text-zinc-200 group-hover:scale-105 transition-transform">
                  {initials}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#121214] ${statusDot(
                      agent.status
                    )}`}
                  />
                </div>
                <span
                  className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${statusBadgeClass(
                    agent.status
                  )}`}
                >
                  {agent.status}
                </span>
              </div>

              {/* Identity */}
              <div className="mt-2.5">
                <div className="text-xs font-bold text-white truncate group-hover:text-[#c4f82a] transition-colors">
                  {agent.name}
                </div>
                <div className="text-[10px] font-mono text-zinc-400 truncate">
                  {agent.role}
                </div>
              </div>

              {/* Metric output */}
              <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-baseline justify-between">
                <span className="text-[10px] font-mono text-zinc-500">{agent.valueLabel}</span>
                <span className="text-base font-bold font-mono tabular-nums text-white group-hover:text-[#c4f82a] transition-colors">
                  {agent.value}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Expanded Detail Panel if Selected */}
      {selectedAgent && (
        <div className="rounded-2xl border border-[#c4f82a]/30 bg-[#16161a] p-4 text-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">{selectedAgent.name}</span>
              <span className="text-zinc-400">({selectedAgent.persona})</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10">
                {selectedAgent.role}
              </span>
            </div>
            <button
              onClick={() => setSelectedAgent(null)}
              className="text-zinc-400 hover:text-white text-xs px-2 py-1"
            >
              ✕ Fermer
            </button>
          </div>
          <p className="text-zinc-300">{selectedAgent.description}</p>
          {selectedAgent.lastLog && (
            <div className="mt-2 pt-2 border-t border-white/5 font-mono text-[11px] text-zinc-400 bg-black/40 p-2 rounded-lg">
              <span className="text-[#c4f82a] font-bold">Dernier journal : </span>
              {selectedAgent.lastLog}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
