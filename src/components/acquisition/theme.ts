// Système de design unique du pôle Acquisition — thème SOMBRE confortable
// (pas noir absolu), pensé pour tout lire sans fatigue et tenir en paysage.
// Réf. : Linear dark, Vercel dark, Attio dark. Surfaces neutres étagées, UN
// seul accent (indigo vif), la couleur réservée à l'état.

// Fonds & surfaces — famille neutre sombre, étagée pour la séparation.
export const BG = "#0f1012"        // canvas
export const SURFACE = "#1a1b1e"   // cartes / tables
export const SURFACE_2 = "#212226" // bandes d'en-tête / hover
export const BORDER = "#2a2b30"    // hairline

// Texte (clair, contraste élevé mais pas blanc pur pour le confort).
export const T_PRIMARY = "#e8eaed"
export const T_SECONDARY = "#9ca3af"
export const T_MUTED = "#6b7280"

// Accent unique, vif sur sombre. Interactif / score haut / highlight.
export const ACCENT = "#6366f1"       // indigo
export const ACCENT_SOFT = "#1e1b34"  // fond d'accent sombre discret

// Bouton primaire = accent plein + texte blanc (contraste net sur sombre).
export const INK = "#6366f1"

// Couleurs de statut (vives, lisibles sur sombre).
export const OK = "#34d399"    // vert
export const WARN = "#fbbf24"  // ambre
export const BAD = "#f87171"   // rouge

// Classes réutilisables.
export const CARD = "rounded-xl border border-[#2a2b30] bg-[#1a1b1e]"
export const CARD_HOVER = "hover:border-[#3a3b42] transition-colors"
export const INPUT =
  "w-full rounded-lg bg-[#1a1b1e] border border-[#2a2b30] px-3 py-2 text-sm text-[#e8eaed] placeholder:text-[#6b7280] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
export const LABEL = "block text-[11px] font-medium text-[#9ca3af] mb-1"
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-[#6366f1] transition hover:bg-[#5b52e8] active:scale-[0.98]"
export const BTN_GHOST =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2a2b30] px-3 py-2 text-sm font-medium text-[#e8eaed] bg-[#1a1b1e] transition hover:bg-[#212226] active:scale-[0.98]"

// ── Système de TABLE dense (réf. Linear 36px / Attio grille 1px) ──────────────
export const TABLE_WRAP = "rounded-xl border border-[#2a2b30] bg-[#1a1b1e] overflow-hidden"
export const TABLE_HEAD =
  "text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af] bg-[#212226] border-b border-[#2a2b30]"
export const TABLE_ROW =
  "border-b border-[#242529] last:border-0 hover:bg-[#212226] transition-colors group"
export const ROW_ACTION =
  "opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"

// Ton du score (couleur = sens).
export function scoreTone(score: number | null): string {
  if (score == null) return "text-[#6b7280]"
  if (score >= 70) return "text-[#818cf8]"
  if (score >= 40) return "text-[#fbbf24]"
  return "text-[#9ca3af]"
}
export function scoreBar(score: number | null): string {
  if (score == null) return "bg-[#2a2b30]"
  if (score >= 70) return "bg-[#6366f1]"
  if (score >= 40) return "bg-[#f59e0b]"
  return "bg-[#4b5563]"
}
