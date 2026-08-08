/**
 * Signature + pied de page légal ajoutés à chaque email de PROSPECTION.
 * Conforme au cadre cold email B2B Belgique/UE 2026 (intérêt légitime RGPD) :
 *  - identité de l'agent + disclosure IA (AI Act art. 50)
 *  - source des données (RGPD art. 14(2)(f)) — d'où vient le contact
 *  - désinscription en un clic (ePrivacy + droit d'opposition ; couplé aux
 *    en-têtes List-Unsubscribe côté envoi, cf. email.ts)
 *  - identification légale de l'entreprise (raison sociale, BCE, siège)
 *  - lien vers la politique de confidentialité
 * Ajouté uniquement à l'envoi réel, jamais dans le brouillon stocké.
 */
const AGENT_NAME = "Manon Verhoeven"
const AGENT_ROLE = "Copywriter — Purity Agency"
const SITE_URL = "https://purity-agency.be"
const INSTAGRAM_URL = "https://www.instagram.com/purityagency.be/"
const PRIVACY_URL = "https://purity-agency.be/legal.html#confidentialite"
const COMPANY_LEGAL = "Purity Agency · BCE 1036.775.590 · Charleroi, Wallonie, Belgique"
const VAT_MENTION = "Petite entreprise — franchise, TVA non applicable (art. 56bis CTVA)"

/**
 * Phrase de divulgation de la source du contact, adaptée à l'origine réelle du
 * lead. Jamais inventée : basée sur `Lead.source` renseigné par le Market Scout.
 */
export function dataSourceDisclosure(source: string, websiteUrl?: string | null): string {
  switch (source) {
    case "GOOGLE_PLACES":
      return "J'ai trouvé les coordonnées publiques de votre entreprise sur votre fiche Google Business."
    case "LINKEDIN":
      return "J'ai trouvé votre profil professionnel public sur LinkedIn."
    case "EXA":
    default:
      return websiteUrl
        ? "J'ai trouvé les coordonnées publiques de votre entreprise sur votre site web."
        : "J'ai trouvé les coordonnées publiques de votre entreprise en recherchant des professionnels de votre secteur en Wallonie."
  }
}

export function withAgentSignature(
  bodyHtml: string,
  opts: { unsubscribeUrl: string; source: string; websiteUrl?: string | null },
): string {
  const sourceLine = dataSourceDisclosure(opts.source, opts.websiteUrl)

  return `
    <div style="font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif; color: #1a1a1a; max-width: 560px;">
      <div style="font-size: 15px; line-height: 1.6;">
        ${bodyHtml}
      </div>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top: 28px; border-top: 1px solid #e5e5e5; padding-top: 20px; width: 100%;">
        <tr>
          <td style="vertical-align: top; padding-right: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: #111111; color: #ffffff; font-size: 17px; font-weight: 600; text-align: center; line-height: 44px;">
              MV
            </div>
          </td>
          <td style="vertical-align: middle;">
            <div style="font-size: 14px; font-weight: 600; color: #111111;">${AGENT_NAME}</div>
            <div style="font-size: 12.5px; color: #6b6b6b; margin-top: 1px;">${AGENT_ROLE}</div>
            <div style="margin-top: 8px;">
              <a href="${SITE_URL}" style="display: inline-block; font-size: 12px; color: #6b6b6b; text-decoration: none; border: 1px solid #d8d8d8; border-radius: 999px; padding: 3px 10px; margin-right: 6px;">Site web</a>
              <a href="${INSTAGRAM_URL}" style="display: inline-block; font-size: 12px; color: #6b6b6b; text-decoration: none; border: 1px solid #d8d8d8; border-radius: 999px; padding: 3px 10px;">Instagram</a>
            </div>
          </td>
        </tr>
      </table>

      <p style="margin-top: 16px; font-size: 11.5px; line-height: 1.6; color: #8a8a8a;">
        ${sourceLine} Si ce message ne vous concerne pas ou si vous ne souhaitez plus être contacté,
        <a href="${opts.unsubscribeUrl}" style="color: #6b6b6b; text-decoration: underline;">désinscrivez-vous en un clic</a>
        — ou répondez simplement « STOP ». Votre demande est immédiate et définitive.
      </p>

      <p style="margin-top: 10px; font-size: 11px; line-height: 1.5; color: #a0a0a0;">
        ${COMPANY_LEGAL}<br>
        ${VAT_MENTION} · <a href="${PRIVACY_URL}" style="color: #a0a0a0;">Politique de confidentialité</a><br>
        Message rédigé par un agent IA de Purity Agency.
      </p>
    </div>
  `.trim()
}
