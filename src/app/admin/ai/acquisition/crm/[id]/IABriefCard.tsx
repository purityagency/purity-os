import { CopyButton } from "./CopyButton"
import type { Objection } from "@/lib/acquisition/salesKit"

// Élément dominant de la fiche — remplace "Pourquoi appeler maintenant",
// "Stratégie générée" (résumé) et l'ancien bandeau IntelStat. Server
// Component pur : les CTA interactifs (Cockpit) sont injectés en slot depuis
// page.tsx pour ne pas rendre ce composant client.

export interface IABriefCardProps {
  summary: string // kit.oneLiner, ou audit.strategy.executiveSummary si présent
  whyCallBullets: string[] // max 3
  hookText: string // phrase d'ouverture prête (kit.callScript.hook)
  topObjection: Objection
  serviceLabel: string
  lossRange: string // ex "300€ – 900€ / semaine"
  ctaSlot: React.ReactNode // bouton(s) Appeler / Voir le script — injectés par page.tsx
}

export function IABriefCard({ summary, whyCallBullets, hookText, topObjection, serviceLabel, lossRange, ctaSlot }: IABriefCardProps) {
  return (
    <section className="glass-panel rounded-3xl p-6 sm:p-7">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-[#A855F7] shadow-[0_0_8px_#A855F7]" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#A855F7]">Résumé IA</span>
      </div>

      <p className="font-heading text-[22px] sm:text-[26px] font-semibold text-[#fafafa] leading-tight text-balance mb-5">{summary}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="sm:col-span-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] mb-1.5">Pourquoi appeler</div>
          <ul className="space-y-1">
            {whyCallBullets.slice(0, 3).map((b, i) => (
              <li key={i} className="text-[13px] text-[#d4d4d8] leading-snug flex gap-1.5">
                <span className="text-[#A855F7] shrink-0">–</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] mb-1.5">Offre pertinente</div>
          <div className="text-[13px] text-[#d4d4d8] font-medium">{serviceLabel}</div>
          <div className="text-[11px] text-[#71717a] mt-1">≈ {lossRange} en jeu</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3.5 mb-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">Objection probable</span>
          <span className="text-[12px] font-semibold text-[#fafafa]">{topObjection.trigger}</span>
        </div>
        <p className="text-[12px] text-[#a1a1aa] leading-relaxed">{topObjection.response}</p>
      </div>

      <div className="rounded-2xl bg-[#A855F7]/10 border border-[#A855F7]/20 p-3.5 mb-5">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#d8b4fe]">Ouverture prête</span>
          <CopyButton text={hookText} label="Copier" />
        </div>
        <p className="text-[13px] text-[#fafafa] leading-relaxed">{hookText}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">{ctaSlot}</div>
    </section>
  )
}
