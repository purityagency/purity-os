// Server Component pur — pas d'interactivité nécessaire. Fusionne les
// événements réels déjà en base (createdAt/lastContactedAt/relanceCount +
// historique des emails) en un seul axe horizontal lisible d'un coup d'œil.

interface TimelineEmailDraft {
  id: string
  subject: string
  status: string
  createdAt: Date
  updatedAt: Date
  openedAt: Date | null
  clickedAt: Date | null
}

export interface CompactTimelineProps {
  createdAt: Date
  lastContactedAt: Date | null
  relanceCount: number
  emailDrafts: TimelineEmailDraft[]
}

interface TimelineEvent {
  label: string
  date: Date
  tone: "neutral" | "info" | "success" | "warn"
}

function fmt(d: Date): string {
  return d.toLocaleDateString("fr-BE", { day: "numeric", month: "short" })
}

const TONE_DOT: Record<TimelineEvent["tone"], string> = {
  neutral: "bg-[#a1a1aa]",
  info: "bg-[#A855F7]",
  success: "bg-emerald-400",
  warn: "bg-amber-400",
}

export function CompactTimeline({ createdAt, lastContactedAt, relanceCount, emailDrafts }: CompactTimelineProps) {
  const events: TimelineEvent[] = [{ label: "Premier contact", date: createdAt, tone: "neutral" }]

  for (const d of emailDrafts) {
    if (d.status === "SENT" || d.openedAt || d.clickedAt) {
      events.push({ label: `Email — ${d.subject.slice(0, 24)}${d.subject.length > 24 ? "…" : ""}`, date: d.updatedAt, tone: "info" })
    }
    if (d.openedAt) events.push({ label: "Email ouvert", date: d.openedAt, tone: "success" })
    if (d.clickedAt) events.push({ label: "Lien cliqué", date: d.clickedAt, tone: "success" })
  }

  if (relanceCount > 0 && lastContactedAt) {
    events.push({ label: `Relance ×${relanceCount}`, date: lastContactedAt, tone: "warn" })
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime())

  if (events.length <= 1) {
    return <p className="text-[12px] text-[#71717a] italic">Aucune interaction enregistrée pour l&apos;instant.</p>
  }

  return (
    <div className="flex items-start gap-0 overflow-x-auto custom-scrollbar pb-1">
      {events.map((e, i) => (
        <div key={i} className="flex items-start shrink-0">
          <div className="flex flex-col items-center w-[120px]">
            <span className={`w-2 h-2 rounded-full ${TONE_DOT[e.tone]}`} />
            <span className="text-[10px] font-mono text-[#71717a] mt-1.5">{fmt(e.date)}</span>
            <span className="text-[11px] text-[#d4d4d8] text-center mt-0.5 leading-snug px-1">{e.label}</span>
          </div>
          {i < events.length - 1 && <div className="h-[2px] w-6 bg-white/10 mt-[3px] shrink-0" />}
        </div>
      ))}
    </div>
  )
}
