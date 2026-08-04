import DOMPurify from "isomorphic-dompurify"

/**
 * Le corps HTML des brouillons d'email (CreativeCopywriter) est construit à
 * partir de texte extrait de sites web externes non fiables (pain points,
 * nom d'entreprise scrapés par MarketScout/IntelligenceAnalyst). Avant ce
 * correctif (finding 2026-08-05), ce HTML était injecté tel quel via
 * dangerouslySetInnerHTML dans la session admin — un site hostile pouvait
 * potentiellement faire exécuter du script dans le navigateur d'Amir.
 * Liste blanche stricte : juste ce qu'un email de prospection nécessite.
 */
export function sanitizeEmailHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li", "div", "span"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  })
}
