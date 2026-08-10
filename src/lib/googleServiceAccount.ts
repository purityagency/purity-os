import { SignJWT, importPKCS8 } from "jose"

// Mint d'un access token Google depuis un compte de service (JWT bearer grant).
// Utilisé pour authentifier les appels PageSpeed Insights : sans token, on tape
// le quota anonyme partagé de Google (souvent épuisé, 429) ; avec, le quota est
// attribué à NOTRE projet. Le token est mis en cache en mémoire jusqu'à sa
// (quasi-)expiration pour éviter un mint à chaque appel.
//
// Le JSON du compte de service est fourni via l'env GOOGLE_SERVICE_ACCOUNT_JSON
// (le fichier n'est pas déployé sur Vercel). Scope "openid" : suffisant pour PSI
// (vérifié), sans droit IAM superflu.

interface ServiceAccount {
  client_email: string
  private_key: string
  private_key_id: string
  token_uri: string
}

let cached: { token: string; exp: number } | null = null

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) return null
  try {
    const sa = JSON.parse(raw) as ServiceAccount
    if (!sa.client_email || !sa.private_key || !sa.token_uri) return null
    return sa
  } catch {
    return null
  }
}

/**
 * Retourne un access token Google valide, ou null si aucun compte de service
 * n'est configuré / en cas d'échec (l'appelant retombe alors sur l'appel sans
 * auth). Ne throw jamais.
 */
export async function getGoogleAccessToken(
  scope = "openid",
): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000)
  if (cached && cached.exp > now + 60) return cached.token

  const sa = loadServiceAccount()
  if (!sa) return null

  try {
    const key = await importPKCS8(sa.private_key, "RS256")
    const assertion = await new SignJWT({ scope })
      .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: sa.private_key_id })
      .setIssuer(sa.client_email)
      .setSubject(sa.client_email)
      .setAudience(sa.token_uri)
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(key)

    const res = await fetch(sa.token_uri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json()
    if (!data.access_token) return null

    const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600
    cached = { token: data.access_token, exp: now + expiresIn }
    return cached.token
  } catch {
    return null
  }
}
