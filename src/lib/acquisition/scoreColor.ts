// Utilitaire unique de coloration des scores — remplace les 4 implémentations
// dupliquées et légèrement incohérentes qui existaient sur la fiche prospect,
// le cockpit d'appel et le rapport d'audit client-facing.

export type ScoreBand = "excellent" | "moyen" | "critique" | "inconnu"

export function scoreBand(
  value: number | null | undefined,
  opts: { invert?: boolean; thresholds?: [number, number] } = {}
): ScoreBand {
  if (value === null || value === undefined) return "inconnu"
  const [high, mid] = opts.thresholds ?? (opts.invert ? [60, 35] : [70, 40])
  if (opts.invert) {
    // invert=true : une valeur haute est BONNE (ex: "opportunité" pour nous, pas pour le prospect).
    return value >= high ? "excellent" : value >= mid ? "moyen" : "inconnu"
  }
  return value >= high ? "excellent" : value >= mid ? "moyen" : "critique"
}

// Classes Tailwind — pour la fiche prospect / cockpit (thème sombre).
export function scoreTextClass(band: ScoreBand): string {
  switch (band) {
    case "excellent": return "text-emerald-400"
    case "moyen": return "text-amber-400"
    case "critique": return "text-red-400"
    case "inconnu": return "text-[#737884]"
  }
}

export function scoreBgClass(band: ScoreBand): string {
  switch (band) {
    case "excellent": return "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
    case "moyen": return "bg-amber-500/15 border-amber-500/30 text-amber-300"
    case "critique": return "bg-red-500/15 border-red-500/30 text-red-300"
    case "inconnu": return "bg-[#212226] border-[#2a2b30] text-[#a3a9b4]"
  }
}

// Couleurs hex — pour les pages client-facing en style inline (audit/deck, thème clair, impression PDF).
export function scoreHexColor(band: ScoreBand): string {
  switch (band) {
    case "excellent": return "#34d399"
    case "moyen": return "#d97706"
    case "critique": return "#f87171"
    case "inconnu": return "#737884"
  }
}

export function scoreLabel(band: ScoreBand): string {
  switch (band) {
    case "excellent": return "Excellent"
    case "moyen": return "À améliorer"
    case "critique": return "Critique"
    case "inconnu": return "N/A"
  }
}
