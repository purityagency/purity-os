"use server"

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { requireAdminSession } from "@/lib/session"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { deliverDraft } from "@/lib/acquisition/deliverDraft"
import { ChiefAcquisitionAI } from "@/lib/agents/acquisition/ChiefAcquisitionAI"

import { CreativeCopywriter } from "@/lib/agents/acquisition/CreativeCopywriter"
import { eventBus } from "@/core/events"
import { DraftReviewedEvent } from "@/lib/agents/acquisition/events"

export type ActionResult = { ok: true; message: string } | { ok: false; message: string }

export type CallOutcome = "NO_ANSWER" | "NOT_INTERESTED" | "INTERESTED" | "MEETING"

/**
 * Boucle de résultat d'appel (Live Call Cockpit) : capture ce qui s'est
 * vraiment passé pendant l'appel. Sans ça, le canal téléphone (56% de la
 * base) ne capitalisait rien — on appelait, et rien n'était enregistré.
 * MEETING -> statut MEETING_BOOKED. Les autres issues restent journalisées
 * dans auditData.callLog (historique complet, jamais écrasé) + relancées
 * normalement par le cron /relances.
 */
export async function logCallOutcome(leadId: string, outcome: CallOutcome, notes: string): Promise<ActionResult> {
  await requireAdminSession()

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) return { ok: false, message: "Lead introuvable." }

  const audit = (lead.auditData as Record<string, unknown> | null) ?? {}
  const prevLog = Array.isArray(audit.callLog) ? (audit.callLog as unknown[]) : []
  const entry = { outcome, notes: notes.trim() || null, at: new Date().toISOString() }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: outcome === "MEETING" ? "MEETING_BOOKED" : lead.status,
      auditData: {
        ...audit,
        callLog: [...prevLog, entry],
        lastCallOutcome: outcome,
        lastCallAt: entry.at,
      } as object,
    },
  })

  revalidatePath("/admin/ai/acquisition/calls")
  revalidatePath("/admin/ai/acquisition/today")
  revalidatePath(`/admin/ai/acquisition/crm/${leadId}`)
  return { ok: true, message: "Issue d'appel enregistrée." }
}

/**
 * Lance une nouvelle Mission depuis l'admin. Le bouton "+ Nouvelle Mission"
 * était décoratif (ni onClick ni action) — voir plans/acquisition-pole-next-phase.md
 * étape 1bis. Le Chief délègue au Market Scout de manière asynchrone ; cette
 * action ne bloque pas sur le scan complet, seulement sur la création de la
 * Mission elle-même.
 */
export async function launchMission(formData: FormData) {
  await requireAdminSession()

  const name = String(formData.get("name") ?? "").trim()
  const sectors = String(formData.get("sectors") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const locations = String(formData.get("locations") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const maxLeads = Number(formData.get("maxLeads") ?? 10)

  if (!name) throw new ValidationError("Le nom de la mission est requis")
  if (sectors.length === 0) throw new ValidationError("Au moins un secteur est requis")
  if (locations.length === 0) throw new ValidationError("Au moins une ville est requise")
  if (!Number.isFinite(maxLeads) || maxLeads <= 0 || maxLeads > 50) {
    throw new ValidationError("Le quota de leads doit être entre 1 et 50")
  }

  const chief = new ChiefAcquisitionAI()
  await chief.launchMission(name, sectors, locations, maxLeads)

  revalidateAcquisition()
}

/**
 * Valide un brouillon d'e-mail de prospection et l'envoie réellement au lead.
 * Porte d'approbation humaine du pipeline Acquisition : rien ne part sans ce
 * clic. Échoue explicitement si le lead n'a pas d'e-mail de contact — jamais
 * d'envoi silencieux vers une adresse absente. Retourne un résultat explicite
 * (au lieu de throw/void) pour que l'UI affiche un vrai succès/échec — avant
 * ce correctif (finding 2026-08-03), rien ne confirmait jamais l'envoi et un
 * échec Resend pouvait être marqué SENT quand même (voir email.ts).
 */
// La logique d'envoi d'un brouillon (garde-fous + envoi + statut + event) vit
// désormais dans @/lib/acquisition/deliverDraft, partagée avec l'autopilote
// (/api/cron/autosend).

function revalidateAcquisition() {
  revalidatePath("/admin/ai/acquisition")
  revalidatePath("/admin/ai/acquisition/drafts")
  revalidatePath("/admin/ai/acquisition/outbox")
}

export async function approveAndSendDraft(draftId: string, _prevState: ActionResult | null): Promise<ActionResult> {
  await requireAdminSession()
  void _prevState

  const draft = await prisma.emailDraft.findUnique({ where: { id: draftId }, include: { lead: true } })
  if (!draft) throw new NotFoundError("Brouillon")

  const result = await deliverDraft(draft)
  revalidateAcquisition()
  if (!result.ok) {
    const hint =
      result.reason === "placeholder"
        ? " Régénérez-le ou corrigez-le avant d'envoyer."
        : ""
    return { ok: false, message: `Email NON envoyé : ${result.message}${hint}` }
  }
  return { ok: true, message: `Email envoyé à ${result.email}.` }
}

/**
 * Envoi GROUPÉ sécurisé : envoie d'un coup tous les brouillons en attente dont
 * le lead a un score ≥ minScore. Chaque brouillon repasse par TOUS les
 * garde-fous unitaires (désinscrit, placeholder, email manquant) — l'envoi
 * groupé n'affaiblit jamais la sécurité, il l'applique juste en série. Retourne
 * un récap (envoyés / ignorés par raison) au lieu d'un simple ok/ko.
 */
export async function bulkApproveAndSend(
  minScore: number,
  _prevState: ActionResult | null,
): Promise<ActionResult> {
  await requireAdminSession()
  void _prevState

  const threshold = Number.isFinite(minScore) ? Math.max(0, Math.min(100, minScore)) : 75

  const drafts = await prisma.emailDraft.findMany({
    where: {
      status: "PENDING_APPROVAL",
      lead: { score: { gte: threshold }, optedOut: false, contactEmail: { not: null } },
    },
    include: { lead: true },
    orderBy: { lead: { score: "desc" } },
  })

  if (drafts.length === 0) {
    return { ok: false, message: `Aucun brouillon éligible (lead score ≥ ${threshold}, email présent, non désinscrit).` }
  }

  let sent = 0
  const skipped: Record<string, number> = {}
  for (const draft of drafts) {
    const r = await deliverDraft(draft)
    if (r.ok) sent++
    else skipped[r.reason] = (skipped[r.reason] ?? 0) + 1
  }

  revalidateAcquisition()

  const skipTotal = Object.values(skipped).reduce((a, b) => a + b, 0)
  const skipDetail = skipTotal > 0 ? ` — ${skipTotal} ignoré(s) (${Object.entries(skipped).map(([k, v]) => `${v} ${k}`).join(", ")})` : ""
  return { ok: true, message: `${sent} email(s) envoyé(s) (score ≥ ${threshold})${skipDetail}.` }
}

export async function rejectDraft(draftId: string, _prevState: ActionResult | null): Promise<ActionResult> {
  await requireAdminSession()
  void _prevState

  const draft = await prisma.emailDraft.findUnique({ where: { id: draftId }, select: { id: true, status: true } })
  if (!draft) throw new NotFoundError("Brouillon")
  if (draft.status !== "PENDING_APPROVAL") {
    return { ok: false, message: "Ce brouillon a déjà été traité." }
  }

  await prisma.emailDraft.update({ where: { id: draft.id }, data: { status: "REJECTED" } })

  // Note: here we don't have companyName fetched, so we need to fetch it
  const draftWithLead = await prisma.emailDraft.findUnique({
    where: { id: draft.id },
    include: { lead: true }
  })
  if (draftWithLead) {
    eventBus.publish(new DraftReviewedEvent(draftWithLead.lead.id, draftWithLead.lead.companyName, "REJECTED"))
  }

  revalidateAcquisition()
  return { ok: true, message: "Brouillon rejeté." }
}

/**
 * Nettoyage groupé : rejette tous les brouillons en attente qui ne pourront
 * JAMAIS partir — lead sans email ou désinscrit. Déclutter la file de
 * validation d'un coup (ex. les 69 brouillons sans email de contact).
 */
export async function bulkRejectUnsendable(_prevState: ActionResult | null): Promise<ActionResult> {
  await requireAdminSession()
  void _prevState

  const { count } = await prisma.emailDraft.updateMany({
    where: {
      status: "PENDING_APPROVAL",
      OR: [{ lead: { contactEmail: null } }, { lead: { optedOut: true } }],
    },
    data: { status: "REJECTED" },
  })

  revalidateAcquisition()
  return count > 0
    ? { ok: true, message: `${count} brouillon(s) injoignable(s) retiré(s) de la file.` }
    : { ok: false, message: "Aucun brouillon injoignable à nettoyer." }
}

/**
 * Recalcule le score de TOUS les leads avec le modèle courant. À lancer après
 * un changement de la méthode de scoring pour que les leads existants
 * bénéficient du nouveau barème (sinon ils gardent leur ancien score figé).
 * Déterministe, aucun appel LLM.
 */
export async function rescoreAllLeads(_prevState: ActionResult | null): Promise<ActionResult> {
  await requireAdminSession()
  void _prevState

  const { LeadScoringAnalyst } = await import("@/lib/agents/acquisition/LeadScoringAnalyst")
  const analyst = new LeadScoringAnalyst()
  const leads = await prisma.lead.findMany({ select: { id: true } })

  let done = 0
  for (const { id } of leads) {
    try {
      // On ne déclenche PAS le test PageSpeed ici : un re-scoring en masse
      // enchaînerait des dizaines d'appels PSI (jusqu'à ~55 s chacun) et ferait
      // timeout la server action. Les hot leads sont testés par le pipeline
      // à la capture, et rafraîchis par le cron /api/cron/pagespeed.
      await analyst.scoreLead(id, { runPageSpeed: false })
      done++
    } catch {
      /* un lead en échec ne bloque pas le lot */
    }
  }

  revalidateAcquisition()
  return { ok: true, message: `${done}/${leads.length} lead(s) re-scoré(s) avec le modèle actuel.` }
}

export async function updateDraftAction(
  draftId: string,
  subject: string,
  bodyHtml: string
): Promise<ActionResult> {
  await requireAdminSession()

  try {
    await prisma.emailDraft.update({
      where: { id: draftId },
      data: { subject, bodyHtml }
    })
    revalidateAcquisition()
    return { ok: true, message: "Brouillon mis à jour avec succès." }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur de mise à jour."
    return { ok: false, message }
  }
}

export async function regenerateDraftAction(
  draftId: string,
  tone: string
): Promise<ActionResult> {
  await requireAdminSession()

  const draft = await prisma.emailDraft.findUnique({
    where: { id: draftId },
    select: { id: true, leadId: true }
  })
  if (!draft) throw new NotFoundError("Brouillon")

  try {
    const copywriter = new CreativeCopywriter()
    await copywriter.draftEmail(draft.leadId, tone, draft.id)
    revalidateAcquisition()
    return { ok: true, message: `Brouillon régénéré avec succès (ton: ${tone}).` }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur de régénération."
    return { ok: false, message }
  }
}

/**
 * Fournit le kit de préparation d'appel d'un lead (dossier, psychologie,
 * script, objections) à la demande — pour le panneau "Fiche d'appel" qui
 * s'ouvre en overlay (pas de navigation). Déterministe, sans LLM.
 */
export async function getCallSheet(leadId: string) {
  await requireAdminSession()
  const { buildSalesKit } = await import("@/lib/acquisition/salesKit")
  const { cleanBelgianPhone } = await import("@/lib/acquisition/phone")

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { mission: { select: { parameters: true } } },
  })
  if (!lead) throw new NotFoundError("Lead")

  const audit = (lead.auditData as { performanceScore?: number | null; seoScore?: number | null; techOpportunity?: number | null; painPoints?: string[]; recommendedModules?: string[]; contactPhone?: string | null; pageSpeed?: unknown } | null) ?? {}
  const sectors = (lead.mission?.parameters as { sectors?: unknown } | null)?.sectors
  const sector = Array.isArray(sectors) && sectors.length > 0 ? String(sectors[0]) : null
  const phone = cleanBelgianPhone(audit.contactPhone)

  const kit = buildSalesKit({
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
    recommendedModules: audit.recommendedModules ?? null,
    techOpportunity: audit.techOpportunity ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pageSpeed: (audit.pageSpeed as any) ?? null,
  })

  return {
    id: lead.id,
    companyName: lead.companyName,
    websiteUrl: lead.websiteUrl,
    location: lead.location,
    googleMapsUrl: lead.googleMapsUrl,
    phone: phone ? { display: phone.display, dial: phone.dial } : null,
    score: lead.score,
    kit,
  }
}

export type CallSheetData = Awaited<ReturnType<typeof getCallSheet>>

/**
 * Enrichit À LA DEMANDE un lead resté en NEW (audit + contact + brouillon +
 * score). Rattrape les leads dont l'enrichissement de fond n'a jamais tourné
 * (fonction du scan tuée avant la fin). Réutilise exactement le pipeline
 * standard (onLeadCaptured).
 */
export async function enrichLeadNow(leadId: string): Promise<ActionResult> {
  await requireAdminSession()

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } })
  if (!lead) throw new NotFoundError("Lead")

  try {
    const { onLeadCaptured } = await import("@/lib/agents/acquisition/handlers/OnLeadCaptured")
    const { LeadCapturedEvent } = await import("@/lib/agents/acquisition/events")
    await onLeadCaptured(new LeadCapturedEvent(leadId))
    revalidatePath(`/admin/ai/acquisition/crm/${leadId}`)
    return { ok: true, message: "Lead enrichi (audit, contact, brouillon, score)." }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Échec de l'enrichissement." }
  }
}

/**
 * Rafraîchit manuellement la note/nb d'avis Google Business d'un lead
 * (bouton "🔄 Actualiser Google Business"). Contourne la fraîcheur de 14
 * jours (déclenchement manuel = intention explicite), contrairement à
 * l'enrichissement automatique qui respecte ce délai.
 */
export async function refreshGooglePlaces(leadId: string): Promise<ActionResult> {
  await requireAdminSession()

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, companyName: true, location: true } })
  if (!lead) throw new NotFoundError("Lead")

  try {
    const { resolvePlaceId, fetchPlaceDetails } = await import("@/lib/acquisition/googlePlaces")
    const current = await prisma.lead.findUnique({ where: { id: leadId }, select: { auditData: true } })
    const existingAudit = (current?.auditData as Record<string, unknown> | null) ?? {}

    // Pas de colonne dédiée (migration Prisma bloquée par un drift Neon non
    // lié à ce chantier) — le Place ID vit dans auditData, sans migration.
    let placeId = typeof existingAudit.googlePlaceId === 'string' ? existingAudit.googlePlaceId : null
    if (!placeId) {
      placeId = await resolvePlaceId(lead.companyName, lead.location)
      if (!placeId) return { ok: false, message: "Entreprise introuvable sur Google Places (ou clé API absente)." }
    }

    const report = await fetchPlaceDetails(placeId)
    await prisma.lead.update({ where: { id: leadId }, data: { auditData: { ...existingAudit, googlePlaceId: placeId, googlePlaces: report } as unknown as Prisma.InputJsonValue } })
    revalidatePath(`/admin/ai/acquisition/crm/${leadId}`)

    return report.error
      ? { ok: false, message: `Échec Google Places : ${report.error}` }
      : { ok: true, message: report.rating ? `Note ${report.rating}/5 (${report.userRatingsTotal ?? 0} avis).` : "Aucune note Google trouvée." }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Échec de l'actualisation Google Places." }
  }
}

/**
 * Génère À LA DEMANDE les angles multi-canaux (message LinkedIn, brief Ads,
 * audit SEO comparatif) pour un lead, et les stocke dans auditData. Déplacé
 * hors du chemin critique de la mission (OnLeadCaptured) où ces 3 appels LLM
 * sérialisés alourdissaient chaque capture — ils ne sont utiles qu'ici, sur la
 * fiche, quand l'humain décide d'attaquer ce prospect en multi-canal.
 */
export async function generateLeadAngles(leadId: string): Promise<ActionResult> {
  await requireAdminSession()

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { mission: { select: { parameters: true } } },
  })
  if (!lead) throw new NotFoundError("Lead")

  const { LinkedInOutreachSpecialist } = await import("@/lib/agents/acquisition/LinkedInOutreachSpecialist")
  const { AdsStrategist } = await import("@/lib/agents/acquisition/AdsStrategist")
  const { SEOLocalScout } = await import("@/lib/agents/acquisition/SEOLocalScout")

  const sectors = (lead.mission?.parameters as { sectors?: unknown } | null)?.sectors
  const sector = Array.isArray(sectors) && sectors.length > 0 ? String(sectors[0]) : "Secteur général"

  let linkedinDraft: unknown = null
  let adsBrief: unknown = null
  let seoAudit: unknown = null

  try { linkedinDraft = await new LinkedInOutreachSpecialist().draftPersonalizedMessage(leadId, "Manque de visibilité locale") } catch { /* isolé */ }
  try { adsBrief = await new AdsStrategist().buildCampaignBrief(sector, "Faible flux de nouveaux clients") } catch { /* isolé */ }
  try { seoAudit = await new SEOLocalScout().compareAgainstCompetitor(leadId, `Concurrent local mieux référencé dans le secteur ${sector}`) } catch { /* isolé */ }

  if (!linkedinDraft && !adsBrief && !seoAudit) {
    return { ok: false, message: "Aucun angle n'a pu être généré (réessayez dans un instant)." }
  }

  const current = (typeof lead.auditData === "object" && lead.auditData !== null ? lead.auditData : {}) as Record<string, unknown>
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      auditData: {
        ...current,
        linkedinDraft: linkedinDraft ?? current.linkedinDraft,
        adsBrief: adsBrief ?? current.adsBrief,
        seoAudit: seoAudit ?? current.seoAudit,
      } as import("@prisma/client").Prisma.InputJsonValue,
    },
  })

  revalidatePath(`/admin/ai/acquisition/crm/${leadId}`)
  return { ok: true, message: "Angles multi-canaux générés." }
}

/**
 * Génère à la demande la stratégie d'opportunité IA (résumé exécutif + plan
 * d'action 30 jours) pour un lead — bouton "Générer une stratégie" sur la
 * fiche. Raisonne sur buildSalesKit(), jamais sur les champs bruts.
 */
export async function generateLeadStrategy(leadId: string): Promise<ActionResult> {
  await requireAdminSession()

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { mission: { select: { parameters: true } } },
  })
  if (!lead) throw new NotFoundError("Lead")

  try {
    const { OpportunityStrategist } = await import("@/lib/agents/acquisition/OpportunityStrategist")
    const { buildLeadKitInput, sectorFromMissionParameters } = await import("@/lib/acquisition/buildLeadKitInput")

    const sector = sectorFromMissionParameters(lead.mission?.parameters)
    const kitInput = buildLeadKitInput(lead, sector)
    const strategy = await new OpportunityStrategist().generateStrategy(kitInput)

    const current = (typeof lead.auditData === "object" && lead.auditData !== null ? lead.auditData : {}) as Record<string, unknown>
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        auditData: {
          ...current,
          strategy,
          strategyGeneratedAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue,
      },
    })

    revalidatePath(`/admin/ai/acquisition/crm/${leadId}`)
    return { ok: true, message: "Stratégie générée." }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Échec de la génération de stratégie." }
  }
}
