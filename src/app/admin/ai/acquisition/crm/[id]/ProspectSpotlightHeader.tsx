import Link from "next/link"
import { StatusBadge } from "@/components/StatusBadge"
import { InsightRing, type InsightRingSegment } from "@/components/ui/insight-ring"

// Header compact (~170px) — Server Component (l'anneau, seul élément animé,
// est lui-même client et s'importe directement, pas besoin de rendre tout le
// header client pour ça).

export interface ProspectSpotlightHeaderProps {
  companyName: string
  activity: string | null // secteur / mission
  location: string | null
  status: string
  ringSegments: InsightRingSegment[]
  ringCenterValue: string
  ringCenterLabel: string
  leadId: string
  moreLinks: { href: string; label: string }[]
  metaStrip: { label: string; value: string }[]
}

export function ProspectSpotlightHeader({
  companyName,
  activity,
  location,
  status,
  ringSegments,
  ringCenterValue,
  ringCenterLabel,
  moreLinks,
  metaStrip,
}: ProspectSpotlightHeaderProps) {
  return (
    <header className="glass-panel rounded-3xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-5">
      <InsightRing segments={ringSegments} size="lg" centerValue={ringCenterValue} centerLabel={ringCenterLabel} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h1 className="font-heading text-[22px] font-bold text-[#fafafa] tracking-tight truncate">{companyName}</h1>
          <StatusBadge status={status} />
        </div>
        <div className="text-[13px] text-[#a1a1aa] flex flex-wrap items-center gap-x-2">
          {activity && <span>{activity}</span>}
          {activity && location && <span className="text-[#52525b]">·</span>}
          {location && <span>{location}</span>}
        </div>

        {metaStrip.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
            {metaStrip.map((m, i) => (
              <div key={i} className="flex items-baseline gap-1.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#52525b]">{m.label}</span>
                <span className="text-[11px] text-[#a1a1aa] tabular-nums">{m.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {moreLinks.length > 0 && (
        <div className="flex sm:flex-col gap-1.5 shrink-0">
          {moreLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-[#a1a1aa] hover:text-[#fafafa] px-2.5 py-1 rounded-lg hover:bg-white/5 transition-colors text-center whitespace-nowrap"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
