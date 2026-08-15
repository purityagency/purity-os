// Score pondéré "Priorité d'attaque" — remplace la lecture brute des scores
// techniques par une note commerciale directement actionnable. Pur/déterministe,
// séparé de LeadScoringAnalyst pour être réutilisable côté UI (fiche prospect)
// sans importer l'agent (Prisma, AutonomousAgent...).
//
// Le score qualité historique (Lead.score, HOT/WARM/COLD) reste inchangé
// ailleurs — celui-ci est un calcul additionnel, stocké dans
// auditData.attackPriority / auditData.scoreBreakdown.

export type AttackPriority = "Faible" | "Moyenne" | "Forte" | "Critique"

export interface ScoreCriterion {
  label: string
  points: number
  maxPoints: number
  reason: string
}

export interface ScoreBreakdown {
  score: number // 0-100, déjà redistribué si Réputation absente
  priority: AttackPriority
  criteria: ScoreCriterion[]
  reputationAvailable: boolean
}

export interface AttackScoreInput {
  hasWhatsApp: boolean | null
  hasContactForm: boolean | null
  hasBookingWidget: boolean | null
  hasPhone: boolean
  googleRating: number | null
  googleReviewCount: number | null
  performanceScore: number | null
  techOpportunity: number | null
  hasViewportMeta: boolean | null
  isHttps: boolean | null
  seoScore: number | null
}

function conversionPoints(input: AttackScoreInput): ScoreCriterion {
  const signals = [input.hasWhatsApp, input.hasContactForm, input.hasBookingWidget, input.hasPhone]
  const present = signals.filter(Boolean).length
  const total = signals.length
  const points = Math.round((present / total) * 30)
  return { label: "Conversion", points, maxPoints: 30, reason: `${present}/${total} signaux de conversion présents (WhatsApp, formulaire, réservation, téléphone)` }
}

function reputationPoints(input: AttackScoreInput): ScoreCriterion | null {
  if (input.googleRating === null && input.googleReviewCount === null) return null
  const ratingPts = input.googleRating !== null ? (input.googleRating / 5) * 12 : 0
  const count = input.googleReviewCount ?? 0
  const countPts = count >= 20 ? 8 : count >= 5 ? 5 : count > 0 ? 2 : 0
  const points = Math.round(ratingPts + countPts)
  return { label: "Réputation", points, maxPoints: 20, reason: `Note ${input.googleRating ?? "—"}/5 sur ${count} avis Google` }
}

function mobilePoints(input: AttackScoreInput): ScoreCriterion {
  if (typeof input.performanceScore === "number") {
    const p = input.performanceScore
    const points = p < 30 ? 15 : p < 50 ? 12 : p < 70 ? 9 : p < 85 ? 5 : 2
    return { label: "Mobile", points, maxPoints: 15, reason: `Performance mobile ${Math.round(p)}/100` }
  }
  // Sans PageSpeed : proxy viewport + HTTPS (signal faible mais réel, jamais inventé).
  const missing = [input.hasViewportMeta === false, input.isHttps === false].filter(Boolean).length
  const points = Math.round((missing / 2) * 15)
  return { label: "Mobile", points, maxPoints: 15, reason: "Non mesurée (PageSpeed) — estimée via viewport/HTTPS" }
}

function seoPoints(input: AttackScoreInput): ScoreCriterion {
  const seo = input.seoScore
  const points = typeof seo === "number" ? (seo < 50 ? 15 : seo < 70 ? 10 : seo < 85 ? 5 : 0) : 6
  return { label: "SEO", points, maxPoints: 15, reason: typeof seo === "number" ? `SEO ${Math.round(seo)}/100` : "SEO non mesuré" }
}

function opportunitePoints(input: AttackScoreInput): ScoreCriterion {
  const opp = input.techOpportunity
  const points = typeof opp === "number" ? Math.round((opp / 100) * 20) : 10
  return { label: "Opportunité", points, maxPoints: 20, reason: typeof opp === "number" ? `Opportunité technique ${opp}/100` : "Non mesurée (opportunité présumée moyenne)" }
}

export function attackPriorityLabel(score: number): AttackPriority {
  if (score >= 80) return "Critique"
  if (score >= 60) return "Forte"
  if (score >= 35) return "Moyenne"
  return "Faible"
}

export function computeScoreBreakdown(input: AttackScoreInput): ScoreBreakdown {
  const conversion = conversionPoints(input)
  const reputation = reputationPoints(input)
  const mobile = mobilePoints(input)
  const seo = seoPoints(input)
  const opportunite = opportunitePoints(input)

  const criteria = [conversion, reputation, mobile, seo, opportunite].filter((c): c is ScoreCriterion => c !== null)
  const totalWeight = criteria.reduce((sum, c) => sum + c.maxPoints, 0) // 100 si Réputation dispo, 80 sinon
  const rawScore = criteria.reduce((sum, c) => sum + c.points, 0)
  const scale = totalWeight > 0 ? 100 / totalWeight : 1
  const score = Math.max(0, Math.min(100, Math.round(rawScore * scale)))

  return {
    score,
    priority: attackPriorityLabel(score),
    criteria,
    reputationAvailable: reputation !== null,
  }
}
