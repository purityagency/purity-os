// Système de design unique du pôle Acquisition — thème CLAIR, épuré, dense,
// pensé pour tenir en paysage (16:9) avec un minimum de scroll. Références :
// dashboards SaaS modernes clairs (Linear light, Vercel, Attio, Stripe).
// Contraste WCAG AA respecté (texte quasi-noir sur blanc), UN seul accent.

// Fonds & surfaces (famille de gris froids, claire).
export const BG = "#f6f7f9"       // canvas
export const SURFACE = "#ffffff"  // cartes
export const SURFACE_2 = "#f0f1f4" // zones secondaires / hover
export const BORDER = "#e6e7eb"   // hairline

// Texte (contraste élevé).
export const T_PRIMARY = "#17171a"
export const T_SECONDARY = "#5b616e"
export const T_MUTED = "#8a909c"

// Accent unique, lisible sur blanc (~7:1). Interactif / score haut / highlight.
export const ACCENT = "#4f46e5"      // indigo
export const ACCENT_SOFT = "#eef0fe" // fond d'accent très clair

// Bouton primaire = quasi-noir + texte blanc (style Linear/Vercel, contraste max).
export const INK = "#17171a"

// Couleurs de statut (toutes AA sur blanc).
export const OK = "#059669"     // vert
export const WARN = "#b45309"   // ambre foncé
export const BAD = "#dc2626"    // rouge

// Classes réutilisables.
export const CARD = "rounded-xl border border-[#e6e7eb] bg-white"
export const CARD_HOVER = "hover:border-[#d4d6dc] transition-colors"
export const INPUT =
  "w-full rounded-lg bg-white border border-[#e6e7eb] px-3 py-2 text-sm text-[#17171a] placeholder:text-[#a2a7b0] focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/30 transition-colors"
export const LABEL = "block text-[11px] font-medium text-[#5b616e] mb-1"
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-[#17171a] transition hover:bg-[#000] active:scale-[0.98]"
export const BTN_GHOST =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#e6e7eb] px-3 py-2 text-sm font-medium text-[#17171a] bg-white transition hover:bg-[#f6f7f9] active:scale-[0.98]"
