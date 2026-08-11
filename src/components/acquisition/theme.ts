// Système de design unique du pôle Acquisition — "Liquid Glass - The Flow"
// Design premium, respirant, fond abyssal et accents vibrants.

// Fonds & surfaces — Liquid Glass
export const BG = "#060309"        // canvas (abyssal Purity)
export const SURFACE = "#0f1014"   // cartes / tables
export const SURFACE_2 = "#1a1b1f" // bandes d'en-tête / hover
export const BORDER = "#2a2b30"    // hairline (ou border-white/5)

// Texte (clair, contraste élevé mais pas blanc pur pour le confort).
export const T_PRIMARY = "#f8fafc"
export const T_SECONDARY = "#94a3b8"
export const T_MUTED = "#64748b"

// Accent unique, violet Purity.
export const ACCENT = "#7c3aed"       // violet
export const ACCENT_SOFT = "#1e1b34"  // fond d'accent sombre discret

// Bouton primaire = accent plein + texte blanc.
export const INK = "#7c3aed"

// Couleurs de statut.
export const OK = "#10b981"    // vert
export const WARN = "#f59e0b"  // ambre
export const BAD = "#ef4444"   // rouge notification (Apple style)

// Classes réutilisables.
export const CARD = "rounded-xl border border-white/5 bg-[#0f1014]"
export const CARD_HOVER = "hover:border-white/10 transition-colors"
export const INPUT =
  "w-full rounded-lg bg-[#0f1014] border border-white/5 px-3 py-2 text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]/30 transition-colors"
export const LABEL = "block text-[11px] font-medium text-[#94a3b8] mb-1"
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-[#7c3aed] transition hover:bg-[#6d28d9] active:scale-[0.98]"
export const BTN_GHOST =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/5 px-3 py-2 text-sm font-medium text-[#f8fafc] bg-[#0f1014] transition hover:bg-[#1a1b1f] active:scale-[0.98]"

// ── Système de TABLE dense ──────────────
export const TABLE_WRAP = "rounded-xl border border-white/5 bg-[#0f1014] overflow-hidden"
export const TABLE_HEAD =
  "text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] bg-[#09090c] border-b border-white/5"
export const TABLE_ROW =
  "border-b border-white/5 last:border-0 hover:bg-[#1a1b1f] transition-colors group"
export const ROW_ACTION =
  "opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"

// Ton du score (couleur = sens).
export function scoreTone(score: number | null): string {
  if (score == null) return "text-[#64748b]"
  if (score >= 70) return "text-[#7c3aed]"
  if (score >= 40) return "text-[#f59e0b]"
  return "text-[#94a3b8]"
}
export function scoreBar(score: number | null): string {
  if (score == null) return "bg-white/5"
  if (score >= 70) return "bg-[#7c3aed]"
  if (score >= 40) return "bg-[#f59e0b]"
  return "bg-[#64748b]"
}
