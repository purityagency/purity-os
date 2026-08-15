// Classification déterministe (zéro LLM, zéro coût, zéro latence) d'une
// réponse entrante — décide comment la boucle de prospection doit réagir
// AVANT de dépenser un appel Manon. Volontairement conservatrice : en cas de
// doute, "other" (Manon prépare une réponse, l'humain valide de toute façon).

export type ReplyIntent = "opt_out" | "auto_reply" | "interested" | "objection" | "other"

const OPT_OUT_PATTERNS = [
  /\bstop\b/i,
  /ne (?:plus|jamais) (?:me |nous )?(?:re)?contact/i,
  /désabonn|desabonn/i,
  /désinscri|desinscri/i,
  /unsubscribe/i,
  /retirez[ -]?moi/i,
  /supprimez? mes? (?:données|coordonnées)/i,
  /ne (?:souhaite|veux) (?:pas|plus) (?:être|etre) (?:contacté|démarché)/i,
]

const AUTO_REPLY_PATTERNS = [
  /out of office/i,
  /absence du bureau/i,
  /je suis (?:actuellement |présentement )?en (?:congé|vacances|arrêt)/i,
  /auto[ -]?repl(y|ied)/i,
  /réponse automatique/i,
  /automatic reply/i,
  /ceci est un message automatique/i,
]

const OBJECTION_PATTERNS = [
  /pas intéressé/i,
  /pas le temps/i,
  /pas de budget/i,
  /on a déjà (?:un|notre) (?:site|prestataire|agence)/i,
  /trop cher/i,
]

const INTERESTED_PATTERNS = [
  /intéress|interess/i,
  /plus d'info|plus d'informations/i,
  /(?:on|nous) (?:peut|pouvons|pourrait|pourrions) (?:en )?(?:parler|discuter|échanger)/i,
  /(?:dispo|disponible)/i,
  /rendez-vous|rdv|appel/i,
  /oui/i,
]

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text))
}

/**
 * `headers` optionnel : si le Worker transmet un en-tête Auto-Submitted
 * (RFC 3834), c'est le signal le plus fiable pour auto_reply — les regex sur
 * le texte restent un filet, pas la source de vérité.
 */
export function classifyReply(text: string, subject: string, headers?: Record<string, string>): ReplyIntent {
  const combined = `${subject}\n${text}`.slice(0, 4000) // borne large, pas besoin du mail entier

  if (headers?.["auto-submitted"] && headers["auto-submitted"].toLowerCase() !== "no") return "auto_reply"
  if (matchesAny(combined, OPT_OUT_PATTERNS)) return "opt_out" // priorité absolue : conformité RGPD/ePrivacy
  if (matchesAny(combined, AUTO_REPLY_PATTERNS)) return "auto_reply"
  if (matchesAny(combined, OBJECTION_PATTERNS)) return "objection"
  if (matchesAny(combined, INTERESTED_PATTERNS)) return "interested"
  return "other"
}
