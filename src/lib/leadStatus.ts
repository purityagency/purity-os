// Source unique de vérité pour les statuts de lead : libellés FR + styles de
// badge. Avant, chaque écran (Kanban, MissionTracker, outbox, inbox, fiche)
// réimplémentait ses propres libellés/couleurs → incohérences ("Répondu" vs
// "A répondu" vs "REPLIED"). Tout passe désormais par ici.

export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "Nouveau",
  ENRICHED: "Enrichi",
  DRAFTED: "Rédigé",
  CONTACTED: "Contacté",
  REPLIED: "A répondu",
  MEETING_BOOKED: "RDV confirmé",
  BOUNCED: "Rebond",
}

// Ordre du pipeline (pour filtres/colonnes).
export const LEAD_STATUS_ORDER = [
  "NEW",
  "ENRICHED",
  "DRAFTED",
  "CONTACTED",
  "REPLIED",
  "MEETING_BOOKED",
  "BOUNCED",
] as const

// Classes Tailwind par statut — thème SOMBRE confortable : tinte translucide +
// texte clair vif, contraste suffisant sur surfaces #1a1b1e / #212226.
export const LEAD_STATUS_BADGE: Record<string, string> = {
  NEW: "bg-[#2a2b30] text-[#9ca3af] border-[#3a3b42]",
  ENRICHED: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  DRAFTED: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  CONTACTED: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  REPLIED: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  MEETING_BOOKED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  BOUNCED: "bg-red-500/15 text-red-300 border-red-500/30",
}

export function leadStatusLabel(status: string): string {
  return LEAD_STATUS_LABELS[status] ?? status
}
