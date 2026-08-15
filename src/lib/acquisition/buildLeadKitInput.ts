import type { LeadKitInput } from "@/lib/acquisition/salesKit"
import type { PageSpeedReport } from "@/lib/acquisition/pageSpeedInsights"

// Forme des champs qu'on lit réellement dans Lead.auditData (Json libre) —
// centralisée ici pour ne plus dupliquer cette interface dans chaque page
// (page.tsx, call/page.tsx, audit/page.tsx, deck/page.tsx, acquisitionActions.ts
// la redéfinissaient chacune avec un sous-ensemble légèrement différent).
export interface LeadAuditData {
  performanceScore?: number | null
  seoScore?: number | null
  techOpportunity?: number | null
  painPoints?: string[]
  recommendedModules?: string[]
  contactPhone?: string | null
  pageSpeed?: PageSpeedReport | null
  hasWhatsApp?: boolean
  hasContactForm?: boolean
  hasBookingWidget?: boolean
  hasAnalytics?: boolean
  hasViewportMeta?: boolean
  isHttps?: boolean
  cmsDetected?: string | null
  socialLinks?: { platform: string; url: string }[]
  companySize?: string | null
  googlePlaces?: { rating?: number | null; userRatingsTotal?: number | null; error?: string }
  attackPriority?: string
  attackScore?: number
  [k: string]: unknown
}

interface LeadLike {
  companyName: string
  location: string | null
  contactName: string | null
  contactRole: string | null
  websiteUrl: string | null
  auditData: unknown
}

/**
 * Construit le LeadKitInput complet (audit technique + signaux Phase 1 +
 * Google Places + secteur) à partir d'un Lead Prisma déjà chargé. Point
 * d'extension unique pour salesKit — évite que chaque page reconstruise cet
 * objet à la main avec un sous-ensemble de champs différent.
 */
export function buildLeadKitInput(lead: LeadLike, sector: string | null): LeadKitInput {
  const audit = (lead.auditData as LeadAuditData | null) ?? {}
  return {
    companyName: lead.companyName,
    location: lead.location,
    contactName: lead.contactName,
    contactRole: lead.contactRole,
    websiteUrl: lead.websiteUrl,
    contactPhone: audit.contactPhone ?? null,
    sector,
    performanceScore: audit.performanceScore ?? null,
    seoScore: audit.seoScore ?? null,
    painPoints: audit.painPoints,
    pageSpeed: audit.pageSpeed ?? null,
    recommendedModules: audit.recommendedModules ?? null,
    techOpportunity: audit.techOpportunity ?? null,
    hasWhatsApp: audit.hasWhatsApp ?? null,
    hasContactForm: audit.hasContactForm ?? null,
    hasBookingWidget: audit.hasBookingWidget ?? null,
    hasAnalytics: audit.hasAnalytics ?? null,
    googleRating: audit.googlePlaces?.rating ?? null,
    googleReviewCount: audit.googlePlaces?.userRatingsTotal ?? null,
    companySize: audit.companySize ?? null,
  }
}

/** Extrait le secteur depuis mission.parameters.sectors[0] (même logique répétée partout jusqu'ici). */
export function sectorFromMissionParameters(parameters: unknown): string | null {
  const sectors = (parameters as { sectors?: unknown } | null)?.sectors
  return Array.isArray(sectors) && sectors.length > 0 ? String(sectors[0]) : null
}
