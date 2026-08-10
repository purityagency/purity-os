// Garde-fou qualité des emails de prospection. Bloque TOUT ce qui ne doit jamais
// atteindre un prospect — pas seulement les placeholders de gabarit. Code-gate
// partagé entre la génération (CreativeCopywriter) et l'envoi
// (approveAndSendDraft/deliverDraft) : on ne fait jamais confiance au seul
// prompt du LLM (finding 2026-08-09 : codes module M07 et prix € qui fuitaient).

const CHECKS: { re: RegExp; label: string }[] = [
  // Placeholders de gabarit non remplis : [crochets], {accolades}
  { re: /\[[^\]\n]{0,60}\]/, label: "crochet [...]" },
  { re: /\{\{?[^}\n]{0,60}\}?\}/, label: "accolade {...}" },
  // Codes module internes du catalogue (M04, M07…) — jamais côté client
  { re: /\bM\d{2}\b/, label: "code module interne (Mxx)" },
  // Prix en euros — la règle interdit de citer les prix catalogue en prospection
  { re: /\d[\d\s.,]*\s*€|€\s*\d/, label: "prix en euros" },
  // Formules de gabarit explicites
  { re: /\bnom du (contact|destinataire|dirigeant)\b|\bvotre (nom|prénom)\b|\[prénom\]|ins[ée]rez|à compl[ée]ter|\bxxx+\b/i, label: "formule de gabarit" },
  // Parenthèses de gabarit / artefacts d'IA : "(voir image)", "(insérer X)",
  // "(lien vers…)", "(votre nom)"… — le LLM les glisse comme instruction à
  // remplir. On ne bloque PAS toute parenthèse (usage légitime en français),
  // seulement celles contenant un mot-clé d'instruction/placeholder.
  {
    re: /\((?:[^)\n]*\b(voir|insérer|insere|ins[ée]rez|lien|image|images|photo|capture|screenshot|logo|prénom|nom du|votre nom|à compl[ée]ter|à remplir|remplir|placeholder|exemple ici|ex\s*:|à personnaliser|adapter ici)\b[^)\n]*)\)/i,
    label: "parenthèse de gabarit (voir image…)",
  },
  // Références à une image / pièce jointe : un cold email texte n'en a pas.
  { re: /\b(voir (l['e ]|la |le )?(image|capture|photo|pièce jointe)|ci-joint|en pi[èe]ce jointe|pi[èe]ce jointe|capture d['e ]écran)\b/i, label: "référence image / pièce jointe" },
]

export function containsPlaceholder(html: string): boolean {
  return CHECKS.some((c) => c.re.test(html))
}

/** Détaille ce qui a été détecté (pour messages/logs). */
export function describeForbidden(html: string): string | null {
  const hit = CHECKS.find((c) => c.re.test(html))
  if (!hit) return null
  const m = html.match(hit.re)
  return `${hit.label}${m ? ` (« ${m[0].replace(/<[^>]+>/g, "").trim().slice(0, 30)} »)` : ""}`
}

// Nettoyage best-effort des placeholders bruts (crochets/accolades). Ne touche
// PAS aux codes module / prix : là il faut régénérer, pas rapiécer.
export function stripPlaceholders(html: string): string {
  return html
    .replace(/(Bonjour|Bonsoir|Salut|Cher|Chère)\s*\[[^\]\n]{0,40}\]\s*,?/gi, "")
    .replace(/\[[^\]\n]{0,60}\]/g, "")
    .replace(/\{\{?[^}\n]{0,60}\}?\}/g, "")
    // Parenthèses de gabarit ("(voir image)", "(insérer X)"…) : on retire la
    // parenthèse entière plutôt que de la laisser polluer le mail.
    .replace(/\s*\((?:[^)\n]*\b(voir|insérer|insere|ins[ée]rez|lien|image|images|photo|capture|screenshot|logo|prénom|nom du|votre nom|à compl[ée]ter|à remplir|remplir|placeholder|exemple ici|ex\s*:|à personnaliser|adapter ici)\b[^)\n]*)\)/gi, "")
    .replace(/<p>\s*,?\s*<\/p>/gi, "")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim()
}
