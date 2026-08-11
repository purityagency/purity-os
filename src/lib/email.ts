import { AppError } from "@/lib/errors"

// Identité d'envoi TRANSACTIONNELLE (factures, accès client, notifications) —
// légitime, jamais du cold. Reste sur le domaine principal.
const TRANSACTIONAL_FROM = "Purity Agency <contact@purity-agency.be>"

/**
 * Identité d'envoi PROSPECTION (cold outreach). Séparée volontairement : le
 * cold email est contraire aux CGU de la plupart des providers et peut faire
 * flagger/bannir un domaine. En l'isolant sur son propre expéditeur (idéalement
 * un domaine dédié comme go-purity.be, à définir via PROSPECTING_FROM), on
 * protège la réputation du domaine principal qui envoie les emails clients.
 * Tant que PROSPECTING_FROM n'est pas défini, on retombe sur l'adresse
 * transactionnelle (comportement actuel inchangé).
 */
export function prospectingFrom(): string {
  return process.env.PROSPECTING_FROM || TRANSACTIONAL_FROM
}

/**
 * Envoi d'email via Resend. Échoue TOUJOURS bruyamment si l'envoi ne part
 * pas réellement — avant ce correctif (finding 2026-08-03), une clé absente
 * ou une erreur Resend étaient avalées en silence pendant que l'appelant
 * (`approveAndSendDraft`) marquait quand même le brouillon `SENT` en base :
 * la base mentait sur un email jamais parti. Zéro dégradation silencieuse,
 * comme partout ailleurs dans ce pôle (voir AgentCore.ts, MarketScout.ts).
 */
export async function sendEmail({
  to,
  subject,
  html,
  listUnsubscribeUrl,
  from = TRANSACTIONAL_FROM,
  bccSelf = true,
}: {
  to: string
  subject: string
  html: string
  // Prospection uniquement : ajoute les en-têtes List-Unsubscribe (RFC 8058,
  // désinscription en un clic exigée par Gmail/Yahoo depuis 2024). À omettre
  // pour les emails transactionnels (accès client, factures) qui ne sont pas
  // du marketing et ne doivent pas porter d'en-tête de désinscription.
  listUnsubscribeUrl?: string
  // Identité d'envoi. Par défaut transactionnelle ; la prospection passe
  // `prospectingFrom()` pour isoler son domaine (protection de réputation).
  from?: string
  // Copie cachée à soi-même. Par défaut activée (trace des rares emails
  // transactionnels clients). La PROSPECTION la désactive : sinon chaque envoi
  // revient en copie dans la boîte de réception (via le forward de contact@),
  // polluant l'inbox avec ses propres envois — l'Outbox du dashboard suffit
  // comme registre.
  bccSelf?: boolean
}) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n=== [EMAIL DEV LOG] ===\nTo: ${to}\nSubject: ${subject}\nBody: ${html}\n=======================\n`)
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey === "re_xxx") {
    throw new AppError(
      "RESEND_API_KEY manquant ou factice — aucun email ne peut être envoyé.",
      "EMAIL_NOT_CONFIGURED",
      502,
    )
  }

  const headers: Record<string, string> | undefined = listUnsubscribeUrl
    ? {
        "List-Unsubscribe": `<${listUnsubscribeUrl}>, <mailto:contact@purity-agency.be?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      }
    : undefined

  let res: Response
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        ...(bccSelf ? { bcc: ["contact@purity-agency.be"] } : {}),
        subject,
        html,
        ...(headers ? { headers } : {}),
      }),
    })
  } catch (e) {
    throw new AppError(`Échec réseau vers Resend : ${e instanceof Error ? e.message : String(e)}`, "EMAIL_NETWORK_ERROR", 502)
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new AppError(`Resend a refusé l'envoi (${res.status}) : ${detail}`, "EMAIL_SEND_FAILED", 502)
  }

  // On récupère l'ID Resend : c'est LA clé qui relie notre envoi aux statuts
  // réels de livraison (delivered/bounced/complained) reçus ensuite par webhook.
  const data = (await res.json().catch(() => null)) as { id?: string } | null
  return { providerId: data?.id ?? null }
}
