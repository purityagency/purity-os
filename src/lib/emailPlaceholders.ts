// Détection/nettoyage des placeholders de gabarit non remplis dans un email de
// prospection ("[nom du contact]", "{{name}}", "[prénom]"…). Un crochet à
// remplir qui atteint un prospect = spam automatisé évident. Code-gate partagé
// entre la génération (CreativeCopywriter) et l'envoi (approveAndSendDraft) :
// on ne fait jamais confiance au seul prompt du LLM.

const PLACEHOLDER_RE =
  /\[[^\]\n]{0,40}\]|\{\{?[^}\n]{0,40}\}?\}|\bnom du (contact|destinataire|dirigeant)\b|\bvotre (nom|prénom)\b/i

export function containsPlaceholder(html: string): boolean {
  return PLACEHOLDER_RE.test(html)
}

// Dernier filet : retire le jeton et rattrape une salutation devenue bancale
// ("Bonjour [prénom]," -> pas de salutation du tout).
export function stripPlaceholders(html: string): string {
  return html
    .replace(/(Bonjour|Bonsoir|Salut|Cher|Chère)\s*\[[^\]\n]{0,40}\]\s*,?/gi, "")
    .replace(/\[[^\]\n]{0,40}\]/g, "")
    .replace(/\{\{?[^}\n]{0,40}\}?\}/g, "")
    .replace(/<p>\s*,?\s*<\/p>/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}
