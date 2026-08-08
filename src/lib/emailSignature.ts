/**
 * Signature + mentions légales d'un email de PROSPECTION.
 *
 * Objectif double, en tension :
 *  1. Conformité cold email B2B Belgique/UE 2026 (intérêt légitime RGPD) :
 *     source des données (art. 14), désinscription (ePrivacy), identification
 *     légale, lien confidentialité, disclosure IA (AI Act art. 50).
 *  2. Délivrabilité onglet PRINCIPAL (pas Promotions) : Gmail classe en
 *     Promotions les mails "marketing" — HTML lourd, avatar, boutons, multiples
 *     liens, header List-Unsubscribe. À faible volume (<50/jour, très loin du
 *     seuil bulk de 5000/jour), on n'est pas un bulk sender : on retire donc le
 *     header List-Unsubscribe (cf. email.ts, non passé) et on garde un rendu
 *     quasi texte, comme un vrai email 1:1. Les obligations légales restent,
 *     mais en texte discret plutôt qu'en blocs stylés.
 */
const AGENT_NAME = "Manon Verhoeven"
const SITE_URL = "https://purity-agency.be"
const PRIVACY_URL = "https://purity-agency.be/legal.html#confidentialite"

/**
 * Divulgation de la source du contact (RGPD art. 14(2)(f)), adaptée à l'origine
 * réelle du lead. Jamais inventée : basée sur `Lead.source` (Market Scout).
 */
export function dataSourceDisclosure(source: string, websiteUrl?: string | null): string {
  switch (source) {
    case "GOOGLE_PLACES":
      return "coordonnées trouvées sur votre fiche Google Business publique"
    case "LINKEDIN":
      return "profil professionnel public trouvé sur LinkedIn"
    case "EXA":
    default:
      return websiteUrl
        ? "coordonnées trouvées sur votre site web"
        : "coordonnées professionnelles trouvées en ligne en Wallonie"
  }
}

export function withAgentSignature(
  bodyHtml: string,
  opts: { unsubscribeUrl: string; source: string; websiteUrl?: string | null },
): string {
  const sourceLine = dataSourceDisclosure(opts.source, opts.websiteUrl)

  // Signature volontairement sobre et proche du texte (aucune image, aucun
  // bouton, un seul lien "cliquable" visible) pour ne pas déclencher le
  // classifieur Promotions de Gmail. Les mentions légales sont en petit texte
  // gris, sur le modèle d'un pied de mail pro classique — pas un encart marketing.
  return `
    <div style="font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; max-width: 560px;">
      ${bodyHtml}
      <div style="margin-top: 22px;">
        ${AGENT_NAME}<br>
        Purity Agency — <a href="${SITE_URL}" style="color: #1a1a1a;">purity-agency.be</a>
      </div>
      <div style="margin-top: 18px; font-size: 11.5px; line-height: 1.55; color: #9a9a9a;">
        ${sourceLine}. Pour ne plus être contacté :
        <a href="${opts.unsubscribeUrl}" style="color: #9a9a9a;">se désinscrire</a>
        ou répondre « STOP » (immédiat et définitif).<br>
        Purity Agency · BCE 1036.775.590 · Charleroi, Belgique · franchise TVA (art. 56bis CTVA) ·
        <a href="${PRIVACY_URL}" style="color: #9a9a9a;">confidentialité</a> · rédigé avec l'aide d'une IA.
      </div>
    </div>
  `.trim()
}
