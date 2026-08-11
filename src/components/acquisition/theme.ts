// Système de design unique du pôle Acquisition — une seule source de vérité.
// Direction : cockpit d'opérations dense, near-black chaud, UN accent lime
// signal (jamais de violet générique, jamais de glow/glass). Chiffres en mono
// tabulaire, séparateurs en hairline plutôt que cartes imbriquées.

export const ACCENT = "#c4f82a" // lime signal — action primaire + état actif
export const ACCENT_INK = "#000000" // texte sur accent

// Fonds & surfaces (une seule famille de gris, chaude).
export const BG = "#0a0a0b"
export const SURFACE = "#141416"
export const SURFACE_2 = "#1b1b1e"

// Classes réutilisables (Tailwind) pour rester cohérent partout.
export const CARD = "rounded-2xl border border-white/[0.07] bg-[#141416]"
export const CARD_HOVER = "hover:border-white/[0.14] transition-colors"
export const INPUT =
  "w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-[#5a5a54] focus:outline-none focus:border-[#c4f82a] transition-colors"
export const LABEL = "block text-[10px] font-mono uppercase tracking-wider text-[#7a7a72] mb-1"

// Texte
export const T_DIM = "text-[#c9c9c2]"
export const T_MUTED = "text-[#7a7a72]"
export const T_FAINT = "text-[#5a5a54]"

// Bouton primaire lime (à composer avec style={{ background: ACCENT }} ou la classe).
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-95 active:scale-[0.98]"
export const BTN_GHOST =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/5 active:scale-[0.98]"
