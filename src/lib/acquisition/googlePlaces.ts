/**
 * Intelligence Google Business — scope volontairement réduit à la note
 * moyenne et au nombre d'avis (pas de photos, pas de contenu d'avis, pas de
 * questions sans réponse : hors scope de ce chantier). Utilise l'API Google
 * Places (Find Place + Place Details, champs "Basic"/"Contact" les moins
 * chers). Même contrat que pageSpeedInsights.ts : ne throw jamais, retourne
 * `.error` en cas d'échec pour que la fiche affiche un état vide propre.
 */

export interface GooglePlaceReport {
  fetchedAt: string
  placeId: string | null
  rating: number | null
  userRatingsTotal: number | null
  error?: string
}

/**
 * Résout le Place ID une seule fois (mis en cache côté appelant sur
 * Lead.googlePlaceId) via l'API "Find Place from Text".
 */
export async function resolvePlaceId(companyName: string, location: string | null): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return null

  try {
    const input = `${companyName} ${location ?? ""}`.trim()
    const params = new URLSearchParams({
      input,
      inputtype: "textquery",
      fields: "place_id",
      key: apiKey,
    })
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params.toString()}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.candidates?.[0]?.place_id ?? null
  } catch {
    return null
  }
}

export async function fetchPlaceDetails(placeId: string): Promise<GooglePlaceReport> {
  const base: GooglePlaceReport = {
    fetchedAt: new Date().toISOString(),
    placeId,
    rating: null,
    userRatingsTotal: null,
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return { ...base, error: "GOOGLE_PLACES_API_KEY non configurée" }

  try {
    const params = new URLSearchParams({
      place_id: placeId,
      fields: "rating,user_ratings_total",
      key: apiKey,
    })
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return { ...base, error: `HTTP ${res.status}` }

    const data = await res.json()
    if (data?.status !== "OK") return { ...base, error: data?.status ?? "Réponse Places invalide" }

    return {
      ...base,
      rating: typeof data.result?.rating === "number" ? data.result.rating : null,
      userRatingsTotal: typeof data.result?.user_ratings_total === "number" ? data.result.user_ratings_total : null,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ...base, error: msg.includes("timeout") || msg.includes("aborted") ? "Places timeout" : msg }
  }
}

// Les avis Google changent lentement — fraîcheur plus large que PageSpeed (7j).
export function isGooglePlacesFresh(report: unknown, maxAgeDays = 14): boolean {
  if (!report || typeof report !== "object") return false
  const at = (report as { fetchedAt?: string }).fetchedAt
  if (!at) return false
  const age = Date.now() - new Date(at).getTime()
  return Number.isFinite(age) && age >= 0 && age < maxAgeDays * 24 * 60 * 60 * 1000
}
