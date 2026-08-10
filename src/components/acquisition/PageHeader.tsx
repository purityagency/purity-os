import type { ReactNode } from "react"

type Tone = "violet" | "emerald" | "amber" | "zinc"

const TONE: Record<Tone, string> = {
  violet: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  zinc: "bg-white/5 text-zinc-300 border-white/10",
}

// En-tête de page unifié pour toute la section Acquisition : même structure,
// même typo, même rythme sur les 6 écrans (cohérence cockpit). Titre + sous-
// titre à gauche ; compteur + actions à droite.
export function PageHeader({
  title,
  subtitle,
  count,
  actions,
}: {
  title: string
  subtitle?: string
  count?: { value: number | string; label: string; tone?: Tone }
  actions?: ReactNode
}) {
  return (
    <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-white/[0.07]">
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        {count && (
          <span className={`text-xs font-mono px-3 py-1 rounded-lg border tabular-nums ${TONE[count.tone ?? "zinc"]}`}>
            {count.value} {count.label}
          </span>
        )}
      </div>
    </div>
  )
}
