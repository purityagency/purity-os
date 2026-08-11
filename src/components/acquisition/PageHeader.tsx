import type { ReactNode } from "react"

type Tone = "indigo" | "emerald" | "amber" | "zinc"

const TONE: Record<Tone, string> = {
  indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  zinc: "bg-[#212226] text-[#a3a9b4] border-[#2a2b30]",
}

// En-tête de page unifié (thème clair) pour toute la section Acquisition.
export function PageHeader({
  title,
  subtitle,
  count,
  actions,
}: {
  title: string
  subtitle?: string
  count?: { value: number | string; label: string; tone?: Tone | "violet" }
  actions?: ReactNode
}) {
  const tone = (count?.tone === "violet" ? "indigo" : count?.tone) ?? "zinc"
  return (
    <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#2a2b30]">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-[#e8eaed] tracking-tight">{title}</h1>
        {subtitle && <p className="text-[14px] text-[#a3a9b4] mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        {count && (
          <span className={`text-xs font-medium px-3 py-1.5 rounded-lg border tabular-nums ${TONE[tone]}`}>
            {count.value} {count.label}
          </span>
        )}
      </div>
    </div>
  )
}
