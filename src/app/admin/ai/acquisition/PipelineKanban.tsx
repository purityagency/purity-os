"use client"

import { useState } from "react"
import { LocationIcon, UserIcon, GlobeIcon } from "@/components/icons"

interface Lead {
  id: string
  companyName: string
  contactEmail: string | null
  contactName: string | null
  location: string | null
  websiteUrl: string | null
  status: string
  score: number | null
  updatedAt: Date | string
}

const STAGES = [
  { key: "NEW",            label: "Nouveaux",      color: "text-zinc-400",   border: "border-zinc-700",    bg: "bg-zinc-900/60",   dot: "bg-zinc-500" },
  { key: "ENRICHED",       label: "Enrichis",      color: "text-blue-400",   border: "border-blue-800/60", bg: "bg-blue-950/30",   dot: "bg-blue-500" },
  { key: "DRAFTED",        label: "Brouillons",    color: "text-amber-400",  border: "border-amber-800/60",bg: "bg-amber-950/30",  dot: "bg-amber-500" },
  { key: "CONTACTED",      label: "Contactés",     color: "text-violet-400", border: "border-violet-700",  bg: "bg-violet-950/30", dot: "bg-violet-500" },
  { key: "REPLIED",        label: "Répondu",       color: "text-cyan-400",   border: "border-cyan-800/60", bg: "bg-cyan-950/30",   dot: "bg-cyan-500" },
  { key: "MEETING_BOOKED", label: "RDV Confirmé",  color: "text-emerald-400",border: "border-emerald-700", bg: "bg-emerald-950/30",dot: "bg-emerald-500" },
]

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-zinc-600 text-[10px] font-mono">—</span>
  const color = score >= 70 ? "text-emerald-400" : score >= 40 ? "text-amber-400" : "text-red-400"
  return <span className={`text-[10px] font-bold font-mono ${color}`}>{score}</span>
}

function LeadCard({ lead }: { lead: Lead }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="group rounded border border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.04] transition-all duration-200 cursor-pointer p-2 space-y-1.5"
      onClick={() => setExpanded(e => !e)}
      role="button"
      aria-expanded={expanded}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold text-white truncate leading-tight">{lead.companyName}</p>
        <ScoreBadge score={lead.score} />
      </div>

      {lead.location && (
        <div className="flex items-center gap-1 text-[10px] text-zinc-500 truncate">
          <LocationIcon className="w-3 h-3 text-zinc-500 shrink-0" />
          <span className="truncate">{lead.location}</span>
        </div>
      )}

      {expanded && (
        <div className="pt-2 border-t border-white/5 space-y-1.5 text-[10px] text-zinc-400">
          {lead.contactName && (
            <div className="flex items-center gap-1 text-zinc-300">
              <UserIcon className="w-3 h-3 text-zinc-500 shrink-0" />
              <span className="truncate">{lead.contactName}</span>
            </div>
          )}
          {lead.contactEmail && (
            <p className="font-mono text-zinc-300 truncate">{lead.contactEmail}</p>
          )}
          {lead.websiteUrl && (
            <a
              href={lead.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-violet-400 hover:underline truncate flex items-center gap-1"
            >
              <GlobeIcon className="w-3 h-3 shrink-0" />
              <span className="truncate">{lead.websiteUrl.replace(/^https?:\/\/(www\.)?/, '')}</span>
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export function PipelineKanban({ leads }: { leads: Lead[] }) {
  const byStage = (stageKey: string) =>
    leads.filter(l => l.status === stageKey)

  const total = leads.length
  const contacted = leads.filter(l => ["CONTACTED", "REPLIED", "MEETING_BOOKED"].includes(l.status)).length
  const convRate = total > 0 ? Math.round((contacted / total) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Mini funnel stats */}
      <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500">
        <span>{total} leads total</span>
        <span>→</span>
        <span className="text-violet-400">{contacted} contactés ({convRate}%)</span>
        <span>→</span>
        <span className="text-emerald-400">
          {leads.filter(l => l.status === "MEETING_BOOKED").length} RDV
        </span>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 overflow-x-auto pb-2">
        {STAGES.map(stage => {
          const stageLeads = byStage(stage.key)
          return (
            <div key={stage.key} className={`rounded-lg border ${stage.border} ${stage.bg} p-2 min-w-[160px] flex flex-col gap-1.5`}>
              {/* Column header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${stage.color}`}>
                    {stage.label}
                  </span>
                </div>
                <span className={`text-[10px] font-bold font-mono ${stage.color} bg-black/20 px-1.5 py-0.5 rounded`}>
                  {stageLeads.length}
                </span>
              </div>

              {/* Lead cards */}
              <div className="space-y-2 flex-1">
                {stageLeads.length === 0 ? (
                  <div className="text-[10px] text-zinc-600 text-center py-4 italic">Vide</div>
                ) : (
                  stageLeads.slice(0, 8).map(lead => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))
                )}
                {stageLeads.length > 8 && (
                  <p className="text-[10px] text-zinc-500 text-center py-1">
                    +{stageLeads.length - 8} autres
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
