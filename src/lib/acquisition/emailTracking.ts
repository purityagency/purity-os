import { makeTrackingToken } from "@/lib/trackingToken"
import { getBaseUrl } from "@/lib/utils"

// Injecte le tracking d'engagement dans un email de prospection AVANT envoi :
//  1. Réécrit les liens http(s) du CORPS vers un redirect tracé (clic = signal
//     fiable) — sur NOTRE domaine (app.purity-agency.be), donc pas de nouveau
//     domaine suspect pour les filtres anti-spam.
//  2. Ajoute un pixel d'ouverture invisible en fin de corps (signal
//     directionnel — gonflable par les proxies Gmail/Apple, à lire avec recul).
//
// À appeler sur le HTML du CORPS uniquement, AVANT d'ajouter la signature : on
// ne trace ni le lien de désinscription ni les liens de la signature.

const HREF_RE = /href=(["'])(https?:\/\/[^"']+)\1/gi

export function injectEmailTracking(bodyHtml: string, draftId: string): string {
  const base = getBaseUrl()
  const token = makeTrackingToken(draftId)

  const withTrackedLinks = bodyHtml.replace(HREF_RE, (_match, quote, url) => {
    const tracked = `${base}/api/track/click?t=${token}&u=${encodeURIComponent(url)}`
    return `href=${quote}${tracked}${quote}`
  })

  const pixel = `<img src="${base}/api/track/open?t=${token}" width="1" height="1" alt="" style="display:none;max-height:0;max-width:0;overflow:hidden" />`
  return `${withTrackedLinks}${pixel}`
}
