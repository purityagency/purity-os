import crypto from "crypto"

// Token de tracking auto-porté (stateless) : on signe l'id du brouillon avec un
// secret serveur, comme le token de désinscription. Un pixel/lien tracé ne peut
// donc pas être forgé pour gonfler les stats d'un autre brouillon. Réutilise
// INTERNAL_API_SECRET (présent en prod, jamais exposé au client).

function getSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) throw new Error("[trackingToken] INTERNAL_API_SECRET manquant")
  return secret
}

// Domaine séparé du token de désinscription : un token d'ouverture ne doit
// jamais être rejouable comme token de désinscription et inversement.
function sign(draftId: string): string {
  return crypto.createHmac("sha256", getSecret()).update(`track:${draftId}`).digest("base64url")
}

export function makeTrackingToken(draftId: string): string {
  return `${Buffer.from(draftId).toString("base64url")}.${sign(draftId)}`
}

/** Retourne le draftId si le token est valide et intègre, sinon null. */
export function verifyTrackingToken(token: string): string | null {
  const parts = token.split(".")
  if (parts.length !== 2) return null
  let draftId: string
  try {
    draftId = Buffer.from(parts[0], "base64url").toString("utf8")
  } catch {
    return null
  }
  if (!draftId) return null

  const expected = sign(draftId)
  const a = Buffer.from(parts[1])
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  return crypto.timingSafeEqual(a, b) ? draftId : null
}
