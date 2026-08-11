"use client"

import { useState } from "react"
import Link from "next/link"
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
  { key: "NEW", label: "Nouveaux", color: "text-[#a3a9b4]", border: "border-[#2a2b30]", bg: "bg-[#212226]", dot: "bg-zinc-400" },
  { key: "ENRICHED", label: "Enrichis", color: "text-sky-400", border: "border-sky-500/30", bg: "bg-sky-500/15", dot: "bg-sky-400" },
  { key: "DRAFTED", label: "Rédigés", color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/15", dot: "bg-amber-400" },
  { key: "CONTACTED", label: "Contactés", color: "text-indigo-400", border: "border-indigo-500/30", bg: "bg-indigo-500/15", dot: "bg-indigo-400" },
  { key: "REPLIED", label: "Réponses", color: "text-cyan-400", border: "border-cyan-500/30", bg: "bg-cyan-500/15", dot: "bg-cyan-400" },
  { key: "MEETING_BOOKED", label: "RDV Gagnés", color: "text-[#6366f1]", border: "border-indigo-300", bg: "bg-indigo-500/15", dot: "bg-[#6366f1]" },
]

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-[#737884] text-[10px] font-mono">—</span>
  const color = score >= 70 ? "text-[#6366f1]" : score >= 40 ? "text-amber-400" : "text-[#a3a9b4]"
  return <span className={`text-[11px] font-bold font-mono ${color}`}>{score}</span>
}

function timeAgo(d: Date | string): string {
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days >= 1) return `${days}j`
  const hours = Math.floor(diff / 3_600_000)
  if (hours >= 1) return `${hours}h`
  return "récent"
}

function LeadCard({ lead }: { lead: Lead }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="group rounded-xl border border-[#2a2b30] bg-[#1a1b1e] hover:border-[#3a3b42] hover:bg-[#212226] transition-all duration-200 p-2.5 space-y-1.5 cursor-pointer"
      onClick={() => setExpanded((e) => !e)}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
    >
      <div className="flex items-start justify-between gap-1.5">
        <p className="text-xs font-bold text-[#e8eaed] truncate leading-snug flex-1 group-hover:text-[#6366f1] transition-colors">
          {lead.companyName}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <ScoreBadge score={lead.score} />
          <svg
            className={`w-3 h-3 text-[#737884] transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 4.5 6 7.5 9 4.5" />
          </svg>
        </div>
      </div>

      <div className="flex items-center justify-between gap-1 text-[10px] text-[#a3a9b4] font-mono">
        {lead.location ? (
          <span className="flex items-center gap-1 truncate">
            <LocationIcon className="w-3 h-3 text-[#737884] shrink-0" />
            <span className="truncate">{lead.location}</span>
          </span>
        ) : (
          <span />
        )}
        <span className="shrink-0 text-[#737884]">{timeAgo(lead.updatedAt)}</span>
      </div>

      {expanded && (
        <div className="pt-2 mt-1 border-t border-[#2a2b30] space-y-2 text-[11px] text-[#cbd0d8] animate-in fade-in duration-150">
          {lead.contactName && (
            <div className="flex items-center gap-1.5 text-[#cbd0d8]">
              <UserIcon className="w-3 h-3 text-[#a3a9b4] shrink-0" />
              <span className="truncate">{lead.contactName}</span>
            </div>
          )}
          {lead.contactEmail && (
            <div className="font-mono text-[10px] text-[#a3a9b4] truncate">
              ✉ {lead.contactEmail}
            </div>
          )}
          <div className="pt-1 flex items-center justify-between">
            {lead.websiteUrl ? (
              <a
                href={lead.websiteUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] font-mono text-sky-400 hover:underline flex items-center gap-1"
              >
                <GlobeIcon className="w-3 h-3" />
                <span>Site web</span>
              </a>
            ) : <span />}
            <Link
              href={`/admin/ai/acquisition/crm/${lead.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-mono font-bold text-[#6366f1] hover:underline"
            >
              Fiche lead →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export function PipelineKanban({
  leads,
  counts,
  total,
}: {
  leads: Lead[]
  counts: Record<string, number>
  total: number
  replyDetectionActive?: boolean
}) {
  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-[#a3a9b4] font-bold">
            Pipeline d&apos;Acquisition
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#212226] text-[#cbd0d8] border border-[#2a2b30]">
            {total} leads
          </span>
        </div>
        <Link
          href="/admin/ai/acquisition/crm"
          className="text-xs font-mono text-[#6366f1] hover:underline font-bold"
        >
          Voir tous les leads →
        </Link>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 flex-1 min-h-0 overflow-x-auto pb-2 custom-scrollbar">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.status === stage.key)
          const count = counts[stage.key] ?? stageLeads.length

          return (
            <div
              key={stage.key}
              className={`flex flex-col rounded-2xl border ${stage.border} ${stage.bg} p-2.5 min-w-[170px]`}
            >
              {/* Stage header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2a2b30]">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                  <span className={`text-xs font-bold font-mono ${stage.color}`}>{stage.label}</span>
                </div>
                <span className="text-[11px] font-bold font-mono tabular-nums text-[#e8eaed] bg-[#1a1b1e] px-1.5 py-0.5 rounded border border-[#2a2b30]">
                  {count}
                </span>
              </div>

              {/* Stage cards */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar max-h-[360px]">
                {stageLeads.length === 0 ? (
                  <p className="text-[10px] font-mono text-[#737884] text-center py-6">Aucun lead</p>
                ) : (
                  stageLeads.slice(0, 15).map((lead) => <LeadCard key={lead.id} lead={lead} />)
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
