/**
 * Test Google PageSpeed Insights (Lighthouse) approfondi, réservé aux HOT leads
 * (score > 60). On n'appelle l'API que sur ce petit sous-ensemble, donc le
 * volume reste sous les limites de l'endpoint public v5 — pas besoin de clé
 * (on n'a de toute façon pas de clé Google Cloud avec l'API PageSpeed activée ;
 * .gsc-key et la clé Gemini ne sont pas compatibles).
 *
 * Contrairement au mini-audit d'enrichissement (IntelligenceAnalyst) qui ne
 * gardait que 2 scores, ici on capture le rapport complet réellement utile pour
 * l'argumentaire commercial : 4 catégories + Core Web Vitals + les principales
 * opportunités d'amélioration chiffrées.
 */

export interface PageSpeedMetric {
  id: string
  title: string
  displayValue: string
  score: number | null // 0-1, null si non noté
}

export interface PageSpeedReport {
  fetchedAt: string
  strategy: "mobile" | "desktop"
  finalUrl: string | null
  scores: {
    performance: number | null // 0-100
    seo: number | null
    accessibility: number | null
    bestPractices: number | null
  }
  coreWebVitals: PageSpeedMetric[] // LCP, FCP, CLS, TBT, Speed Index
  opportunities: PageSpeedMetric[] // top optimisations chiffrées
  error?: string
}

const VITAL_IDS = [
  "largest-contentful-paint",
  "first-contentful-paint",
  "cumulative-layout-shift",
  "total-blocking-time",
  "speed-index",
] as const

interface LhAudit {
  id?: string
  title?: string
  displayValue?: string
  score?: number | null
  numericValue?: number
  details?: { type?: string; overallSavingsMs?: number }
}

function pct(score: unknown): number | null {
  return typeof score === "number" ? Math.round(score * 100) : null
}

/**
 * Lance le test PSI mobile sur une URL. Ne throw jamais : en cas d'échec réseau
 * ou de rate-limit, retourne un rapport avec `error` renseigné pour que la fiche
 * puisse afficher "test indisponible" au lieu de casser.
 */
export async function runPageSpeedTest(
  url: string,
  strategy: "mobile" | "desktop" = "mobile",
): Promise<PageSpeedReport> {
  const base: PageSpeedReport = {
    fetchedAt: new Date().toISOString(),
    strategy,
    finalUrl: null,
    scores: { performance: null, seo: null, accessibility: null, bestPractices: null },
    coreWebVitals: [],
    opportunities: [],
  }

  try {
    const categories = ["performance", "seo", "accessibility", "best-practices"]
    const params = new URLSearchParams()
    params.set("url", url)
    params.set("strategy", strategy)
    for (const c of categories) params.append("category", c)
    // Avec une clé API Google (API PageSpeed activée), le quota passe à ~25k/j
    // attribués à NOTRE projet. Sans clé, on tape le quota anonyme partagé de
    // Google — souvent épuisé (HTTP 429). La clé rend la feature fiable.
    const apiKey = process.env.PAGESPEED_API_KEY
    if (apiKey) params.set("key", apiKey)

    const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`
    // PSI peut être lent (Lighthouse tourne côté Google) — timeout large mais borné.
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(55000) })
    if (!res.ok) {
      const detail = res.status === 429
        ? "quota Google épuisé — ajoutez une clé PAGESPEED_API_KEY (gratuite, 25k/j)"
        : `HTTP ${res.status}`
      return { ...base, error: detail }
    }

    const data = await res.json()
    const lh = data?.lighthouseResult
    if (!lh) return { ...base, error: "Réponse PSI sans résultat Lighthouse" }

    const cats = lh.categories ?? {}
    const audits: Record<string, LhAudit> = lh.audits ?? {}

    const coreWebVitals: PageSpeedMetric[] = VITAL_IDS.map((id): PageSpeedMetric | null => {
      const a = audits[id]
      return a
        ? { id, title: a.title ?? id, displayValue: a.displayValue ?? "—", score: a.score ?? null }
        : null
    }).filter((m): m is PageSpeedMetric => m !== null)

    // Opportunités : audits Lighthouse de type "opportunity" avec un gain temps
    // réel, triés du plus gros gain au plus petit. C'est ce qui parle à un client
    // ("vous perdez 2,4 s au chargement à cause de X").
    const opportunities: PageSpeedMetric[] = Object.values(audits)
      .filter((a) => a.details?.type === "opportunity" && (a.details?.overallSavingsMs ?? 0) > 100)
      .sort((a, b) => (b.details?.overallSavingsMs ?? 0) - (a.details?.overallSavingsMs ?? 0))
      .slice(0, 5)
      .map((a) => ({
        id: a.id ?? "",
        title: a.title ?? a.id ?? "",
        displayValue: a.displayValue ?? "",
        score: a.score ?? null,
      }))

    return {
      ...base,
      finalUrl: lh.finalUrl ?? lh.requestedUrl ?? url,
      scores: {
        performance: pct(cats.performance?.score),
        seo: pct(cats.seo?.score),
        accessibility: pct(cats.accessibility?.score),
        bestPractices: pct(cats["best-practices"]?.score),
      },
      coreWebVitals,
      opportunities,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ...base, error: msg.includes("timeout") || msg.includes("aborted") ? "PSI timeout" : msg }
  }
}

// Un rapport de moins de N jours est considéré frais : évite de relancer un test
// à chaque re-scoring (rescoreAllLeads) alors que le site n'a pas changé.
export function isPageSpeedFresh(report: unknown, maxAgeDays = 7): boolean {
  if (!report || typeof report !== "object") return false
  const at = (report as { fetchedAt?: string }).fetchedAt
  if (!at) return false
  const age = Date.now() - new Date(at).getTime()
  return Number.isFinite(age) && age >= 0 && age < maxAgeDays * 24 * 60 * 60 * 1000
}
