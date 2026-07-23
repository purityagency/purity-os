// Rate-limit mémoire par IP — même logique que purity-agency-site/server/app.js.
// Suffisant pour une seule instance ; à remplacer par un store partagé (Redis)
// si l'app tourne un jour derrière plusieurs instances.
type Bucket = { start: number; count: number }
const buckets = new Map<string, Bucket>()

function clientIp(request: Request) {
  const fwd = request.headers.get("x-forwarded-for") || ""
  return fwd.split(",")[0].trim() || "unknown"
}

function checkRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const entry = buckets.get(key)

  if (!entry || now - entry.start > windowMs) {
    buckets.set(key, { start: now, count: 1 })
    return false
  }

  entry.count++
  return entry.count > max
}

/** Retourne true si la requête (Route Handler) doit être bloquée (limite dépassée). */
export function rateLimit(request: Request, scope: string, max: number, windowMs: number) {
  return checkRateLimit(`${scope}:${clientIp(request)}`, max, windowMs)
}

/** Variante pour les contextes sans objet Request Web (ex: NextAuth authorize). */
export function rateLimitByHeaders(headers: Record<string, unknown> | undefined, scope: string, max: number, windowMs: number) {
  const raw = headers?.["x-forwarded-for"]
  const fwd = Array.isArray(raw) ? raw[0] : String(raw ?? "")
  const ip = fwd.split(",")[0].trim() || "unknown"
  return checkRateLimit(`${scope}:${ip}`, max, windowMs)
}

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of buckets) {
    if (now - entry.start > 30 * 60 * 1000) buckets.delete(key)
  }
}, 5 * 60 * 1000).unref()
