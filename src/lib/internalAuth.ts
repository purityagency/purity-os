import crypto from "crypto"

/**
 * Compare deux signatures en temps constant, sans jamais lever d'exception.
 *
 * `crypto.timingSafeEqual` lève un RangeError si les deux tampons n'ont pas la
 * même longueur. Comme la signature vient d'un en-tête contrôlé par l'appelant,
 * une signature de longueur inattendue faisait remonter l'exception jusqu'au
 * try/catch de la route, qui répondait 500 au lieu de 401.
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8")
  const bufB = Buffer.from(b, "utf8")
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * Vérifie l'authentification d'une requête interne.
 *
 * Deux modes, dans cet ordre :
 *  1. Signature HMAC-SHA256 + horodatage (anti-rejeu 5 min) — nécessite que
 *     l'appelant passe `rawBodyText`, sinon la signature ne peut pas être
 *     recalculée et ce mode est ignoré.
 *  2. Jeton Bearer partagé — repli, conservé pour les appelants qui ne signent
 *     pas encore.
 *
 * Toute route interne devrait passer `rawBodyText` : sans lui, l'en-tête de
 * signature est purement décoratif.
 */
export function verifyInternalSecret(request: Request, rawBodyText?: string): boolean {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) return false

  const signature = request.headers.get("x-purity-signature") || ""
  const timestamp = request.headers.get("x-purity-timestamp") || ""

  if (signature && timestamp && rawBodyText !== undefined) {
    const reqTime = Date.parse(timestamp)
    if (Number.isNaN(reqTime) || Math.abs(Date.now() - reqTime) > 5 * 60 * 1000) {
      return false // décalage > 5 minutes : rejet anti-rejeu
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(timestamp + "." + rawBodyText)
      .digest("hex")

    if (safeCompare(signature, expectedSignature)) return true
  }

  const authHeader = request.headers.get("authorization") || ""
  const token = authHeader.replace("Bearer ", "").trim()
  return Boolean(token) && safeCompare(token, secret)
}

/**
 * Lit le corps brut d'une requête et le renvoie avec son JSON décodé, pour que
 * la route puisse à la fois vérifier la signature (qui porte sur le texte exact)
 * et exploiter les données.
 */
export async function readSignedBody(
  request: Request,
): Promise<{ rawText: string; body: Record<string, unknown> }> {
  const rawText = await request.text().catch(() => "")
  let body: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(rawText)
    if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>
  } catch {
    // corps non-JSON : la route décidera quoi faire d'un body vide
  }
  return { rawText, body }
}
