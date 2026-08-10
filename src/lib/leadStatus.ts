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

// Classes Tailwind par statut — accent net, sans glow ni glassmorphism.
export const LEAD_STATUS_BADGE: Record<string, string> = {
  NEW: "bg-white/5 text-zinc-300 border-white/15",
  ENRICHED: "bg-blue-500/10 text-blue-300 border-blue-500/25",
  DRAFTED: "bg-amber-500/10 text-amber-300 border-amber-500/25",
  CONTACTED: "bg-violet-500/10 text-violet-300 border-violet-500/25",
  REPLIED: "bg-cyan-500/10 text-cyan-300 border-cyan-500/25",
  MEETING_BOOKED: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
  BOUNCED: "bg-red-500/10 text-red-300 border-red-500/25",
}

export function leadStatusLabel(status: string): string {
  return LEAD_STATUS_LABELS[status] ?? status
}
