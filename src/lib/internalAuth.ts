import crypto from "crypto"

// Vérification du secret partagé et de la signature HMAC-SHA256 avec anti-rejeu (5 min max)
export function verifyInternalSecret(request: Request, rawBodyText?: string): boolean {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) return false

  const signature = request.headers.get("x-purity-signature") || ""
  const timestamp = request.headers.get("x-purity-timestamp") || ""

  // Si la signature HMAC est présente, procéder à la vérification cryptographique Zero-Trust
  if (signature && timestamp && rawBodyText) {
    const reqTime = Date.parse(timestamp)
    if (isNaN(reqTime) || Math.abs(Date.now() - reqTime) > 5 * 60 * 1000) {
      return false // Rejet si décalage > 5 minutes (Anti-Replay Attack)
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(timestamp + "." + rawBodyText)
      .digest("hex")

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return true
    }
  }

  // Fallback : Vérification du jeton Bearer classique
  const authHeader = request.headers.get("authorization") || ""
  const token = authHeader.replace("Bearer ", "").trim()
  return token === secret
}
