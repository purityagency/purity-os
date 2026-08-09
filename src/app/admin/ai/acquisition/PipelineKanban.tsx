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
  { key: "NEW",            label: "Nouveaux",      color: "text-zinc-400",   border: "border-zinc-700",    bg: "bg-zinc-900/60",   dot: "bg-zinc-500" },
  { key: "ENRICHED",       label: "Enrichis",      color: "text-blue-400",   border: "border-blue-800/60", bg: "bg-blue-950/30",   dot: "bg-blue-500" },
  { key: "DRAFTED",        label: "Rédigés",       color: "text-amber-400",  border: "border-amber-800/60",bg: "bg-amber-950/30",  dot: "bg-amber-500" },
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
      className="group rounded border border-white/[0.05] bg-[#0a0510] hover:border-violet-500/30 hover:bg-white/[0.03] transition-all duration-300 cursor-pointer p-1.5 space-y-1"
      onClick={() => setExpanded(e => !e)}
      role="button"
      aria-expanded={expanded}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-[10px] font-semibold text-white truncate leading-tight flex-1">{lead.companyName}</p>
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
          <Link
            href={`/admin/ai/acquisition/crm?lead=${lead.id}`}
            onClick={e => e.stopPropagation()}
            className="inline-block text-violet-300 hover:text-violet-200 hover:underline"
          >
            Ouvrir la fiche →
          </Link>
        </div>
      )}
    </div>
  )
}

export function PipelineKanban({
  leads,
  counts,
  total,
  replyDetectionActive,
}: {
  leads: Lead[]
  counts: Record<string, number>
  total: number
  replyDetectionActive: boolean
}) {
  const byStage = (stageKey: string) => leads.filter(l => l.status === stageKey)

  // Chiffres du funnel = comptes RÉELS (passés par le serveur), jamais dérivés
  // du tableau plafonné à 200 cartes.
  const contacted = (counts["CONTACTED"] ?? 0) + (counts["REPLIED"] ?? 0) + (counts["MEETING_BOOKED"] ?? 0)
  const convRate = total > 0 ? Math.round((contacted / total) * 100) : 0
  const meetings = counts["MEETING_BOOKED"] ?? 0
  const replied = counts["REPLIED"] ?? 0

  return (
    <div className="space-y-3">
      {/* Funnel réel — mis en avant, avec vérité sur la détection de réponses */}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs font-mono">
        <span className="text-zinc-300"><span className="font-bold text-white tabular-nums">{total}</span> sourcés</span>
        <span className="text-zinc-600">→</span>
        <span className="text-violet-300"><span className="font-bold tabular-nums">{contacted}</span> contactés <span className="text-zinc-500">({convRate}%)</span></span>
        <span className="text-zinc-600">→</span>
        {replyDetectionActive ? (
          <span className="text-cyan-300"><span className="font-bold tabular-nums">{replied}</span> répondu</span>
        ) : (
          <span className="text-amber-400/90" title="Le Worker de détection n'est pas déployé — les réponses arrivent dans Gmail mais ne sont pas comptées ici.">
            réponses <span className="underline decoration-dotted">non mesurées auto</span>
          </span>
        )}
        <span className="text-zinc-600">→</span>
        <span className={meetings > 0 ? "text-emerald-300" : "text-red-400/90"}>
          <span className="font-bold tabular-nums">{meetings}</span> RDV
        </span>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-2 overflow-x-auto pb-2 h-full items-start" style={{ scrollbarWidth: 'none' }}>
        {STAGES.map(stage => {
          const stageLeads = byStage(stage.key)
          const realCount = counts[stage.key] ?? 0
          const truncated = realCount > stageLeads.length
          return (
            <div key={stage.key} className={`rounded-lg border ${stage.border} ${stage.bg} p-1.5 w-[200px] shrink-0 flex flex-col gap-1 max-h-full`}>
              {/* Column header — compte RÉEL */}
              <div className="flex items-center justify-between mb-1 px-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                  <span className={`text-[9px] font-semibold uppercase tracking-wider ${stage.color}`}>
                    {stage.label}
                  </span>
                </div>
                <span className={`text-[9px] font-bold font-mono ${stage.color} bg-black/40 px-1.5 rounded`}>
                  {realCount}
                </span>
              </div>

              {/* Lead cards (échantillon si la colonne dépasse 200 chargés) */}
              <div className="space-y-1.5 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                {stageLeads.length === 0 ? (
                  <div className="text-[9px] text-zinc-600 text-center py-2 italic">
                    {stage.key === "REPLIED" && !replyDetectionActive ? "détection auto off" : "Vide"}
                  </div>
                ) : (
                  <>
                    {stageLeads.map(lead => (
                      <LeadCard key={lead.id} lead={lead} />
                    ))}
                    {truncated && (
                      <Link href="/admin/ai/acquisition/crm" className="block text-[9px] text-zinc-500 hover:text-violet-300 text-center py-1">
                        + {realCount - stageLeads.length} autres — voir CRM
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
