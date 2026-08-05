/**
 * Sanitisation HTML sans dépendance DOM (pas de jsdom, pas de DOMPurify).
 *
 * Contexte : isomorphic-dompurify tirait jsdom comme dépendance serveur.
 * jsdom utilise @exodus/bytes (ESM pur) via html-encoding-sniffer, ce qui
 * provoque ERR_REQUIRE_ESM dans le runtime Vercel/Turbopack et crashe la page
 * /admin/acquisition (finding 2026-08-05).
 *
 * Solution : allowlist de tags/attributs implémentée en regex pure — suffisante
 * pour du HTML email de prospection (<p>, <br>, <strong>, <a href>…).
 * Le DOMPurify réel reste utilisable côté client (window disponible).
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u",
  "a", "ul", "ol", "li", "div", "span",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
};

/**
 * Supprime tout tag HTML non listé dans ALLOWED_TAGS et tout attribut non
 * autorisé. Fonctionne côté serveur (Node.js pur) sans DOM.
 */
export function sanitizeEmailHtml(html: string): string {
  // Supprimer les commentaires HTML et scripts inline
  let clean = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  // Supprimer les tags non autorisés (conserver leur contenu texte)
  clean = clean.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, tag: string, attrs: string) => {
    const tagLower = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(tagLower)) return ""; // Tag non autorisé → supprimé

    // Filtrer les attributs
    const allowedForTag = ALLOWED_ATTRS[tagLower];
    if (!allowedForTag) {
      // Tag autorisé sans attributs (ex: <p>, <br>, <strong>)
      return match.startsWith("</") ? `</${tagLower}>` : `<${tagLower}>`;
    }

    // Reconstruire le tag en ne gardant que les attributs autorisés
    const safeAttrs = [...attrs.matchAll(/([a-zA-Z-]+)\s*=\s*["']([^"'<>]*)["']/g)]
      .filter(([, attr]) => allowedForTag.has(attr.toLowerCase()))
      // Bloquer les href javascript:
      .filter(([, attr, val]) => !(attr === "href" && /^\s*javascript:/i.test(val)))
      .map(([, attr, val]) => `${attr}="${val}"`)
      .join(" ");

    const closing = match.startsWith("</") ? "/" : "";
    return safeAttrs ? `<${closing}${tagLower} ${safeAttrs}>` : `<${closing}${tagLower}>`;
  });

  return clean;
}

