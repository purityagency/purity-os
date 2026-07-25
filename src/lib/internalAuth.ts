// Vérification du secret partagé pour les routes /api/internal/* appelées
// par purity-agency-site (server-to-server, jamais exposé au navigateur).
export function verifyInternalSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization") || ""
  const token = authHeader.replace("Bearer ", "").trim()
  const secret = process.env.INTERNAL_API_SECRET
  return Boolean(secret) && token === secret
}
