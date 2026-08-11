"use client"

import { useState } from "react"

interface Mission {
  id: string
  name: string
  status: string
  createdAt: Date | string
  _count: { leads: number }
  // parameters est un Json Prisma — on le cast en lecture seule
  parameters: unknown
}

const STATUS_STYLE: Record<string, { label: string; classes: string }> = {
  ACTIVE:    { label: "Actif",     classes: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" },
  COMPLETED: { label: "Terminé",   classes: "bg-zinc-500/10 text-[#a3a9b4] border border-zinc-600/20" },
  PAUSED:    { label: "Pausé",     classes: "bg-amber-500/150/10 text-amber-400 border border-amber-500/20" },
}

function MissionCard({ mission }: { mission: Mission }) {
  const params = mission.parameters as { maxLeads?: number; sectors?: string[]; locations?: string[] } | null
  const maxLeads = params?.maxLeads ?? 50
  const progress = Math.min(Math.round((mission._count.leads / maxLeads) * 100), 100)
  const style = STATUS_STYLE[mission.status] ?? STATUS_STYLE.PAUSED

  return (
    <div className="py-1.5 border-b border-[#2a2b30] space-y-1 hover:bg-[#212226] px-1 -mx-1 transition-colors group">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 shrink-0 ${mission.status === "ACTIVE" ? "bg-emerald-500/150 animate-pulse rounded-sm" : "bg-zinc-600 rounded-sm"}`} />
          <p className="font-mono font-bold text-[10px] text-[#cbd0d8] truncate">{mission.name}</p>
        </div>
        <span className={`shrink-0 text-[10px] uppercase tracking-wider font-mono ${style.classes}`}>
          [{style.label}]
        </span>
      </div>
      
      {params?.sectors && (
        <div className="pl-3 text-[10px] font-mono text-[#737884] truncate">
          &gt; TARGET: {params.sectors.join(", ")}
          {params.locations ? ` | LOC: ${params.locations.join(", ")}` : ""}
        </div>
      )}

      {/* Progress bar terminal style */}
      <div className="pl-3 space-y-0.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-[#737884]">
          <span>{mission._count.leads} SRC&apos;D</span>
          <span>{progress}% [{maxLeads}]</span>
        </div>
        <div className="h-[1px] bg-[#212226] w-full">
          <div
            className="h-full bg-[#6366f1] transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function MissionTracker({ missions }: { missions: Mission[] }) {
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ALL")

  const filtered = missions.filter(m =>
    filter === "ALL" ? true : m.status === filter
  )

  const totalLeads = missions.reduce((s, m) => s + m._count.leads, 0)
  const activeMissions = missions.filter(m => m.status === "ACTIVE").length

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex items-center gap-3 text-[10px] font-mono">
        <span className="text-[#737884]">{totalLeads} leads générés</span>
        <span className="text-emerald-400">· {activeMissions} mission(s) active(s)</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-[#212226] rounded-lg p-1 w-fit">
        {(["ALL", "ACTIVE", "COMPLETED"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              filter === f
                ? "bg-[#6366f1] text-white"
                : "text-[#a3a9b4] hover:text-[#e8eaed]"
            }`}
          >
            {f === "ALL" ? "Toutes" : f === "ACTIVE" ? "Actives" : "Terminées"}
          </button>
        ))}
      </div>

      {/* Mission cards */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-xs text-[#737884] text-center py-4">Aucune mission.</p>
        ) : (
          filtered.map(m => <MissionCard key={m.id} mission={m} />)
        )}
      </div>
    </div>
  )
}
