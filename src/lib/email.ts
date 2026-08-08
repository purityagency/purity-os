import { AppError } from "@/lib/errors"

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
}: {
  to: string
  subject: string
  html: string
  // Prospection uniquement : ajoute les en-têtes List-Unsubscribe (RFC 8058,
  // désinscription en un clic exigée par Gmail/Yahoo depuis 2024). À omettre
  // pour les emails transactionnels (accès client, factures) qui ne sont pas
  // du marketing et ne doivent pas porter d'en-tête de désinscription.
  listUnsubscribeUrl?: string
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
        from: "Purity Agency <contact@purity-agency.be>",
        to: [to],
        bcc: ["contact@purity-agency.be"],
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
}
