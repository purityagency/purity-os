import crypto from "crypto"

// Token de désinscription auto-porté (stateless) : on ne stocke pas de jeton en
// base, on signe l'id du lead avec un secret serveur. Le lien de désinscription
// est donc infalsifiable (impossible de désinscrire un autre lead sans le
// secret) sans nécessiter de table de tokens. Réutilise INTERNAL_API_SECRET —
// déjà présent en prod, jamais exposé au client.

function getSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) throw new Error("[unsubscribeToken] INTERNAL_API_SECRET manquant")
  return secret
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url")
}

export function makeUnsubscribeToken(leadId: string): string {
  const sig = crypto.createHmac("sha256", getSecret()).update(leadId).digest("base64url")
  return `${b64url(leadId)}.${sig}`
}

/** Retourne le leadId si le token est valide et intègre, sinon null. */
export function verifyUnsubscribeToken(token: string): string | null {
  const parts = token.split(".")
  if (parts.length !== 2) return null
  let leadId: string
  try {
    leadId = Buffer.from(parts[0], "base64url").toString("utf8")
  } catch {
    return null
  }
  if (!leadId) return null

  const expected = crypto.createHmac("sha256", getSecret()).update(leadId).digest("base64url")
  const a = Buffer.from(parts[1])
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  return crypto.timingSafeEqual(a, b) ? leadId : null
}
