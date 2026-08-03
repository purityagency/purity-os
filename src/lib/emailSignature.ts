/**
 * Carte de signature ajoutée à chaque email de prospection envoyé — reprend
 * la présentation de l'ancien système (persona nommé + rôle + liens + badge
 * "Message généré par IA", transparence assumée plutôt que cachée). Le corps
 * du brouillon (généré par CreativeCopywriter) reste inchangé ; cette carte
 * est ajoutée uniquement à l'envoi réel, jamais dans les données stockées.
 */
const AGENT_NAME = "Manon Verhoeven"
const AGENT_ROLE = "Copywriter — Purity Agency"
const SITE_URL = "https://purity-agency.be"
const INSTAGRAM_URL = "https://www.instagram.com/purityagency.be/"

export function withAgentSignature(bodyHtml: string): string {
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

      <p style="margin-top: 14px; font-size: 11px; color: #a0a0a0;">Message rédigé par un agent IA de Purity Agency.</p>
    </div>
  `.trim()
}
