"use server"

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { requireAdminSession } from "@/lib/session"
import { AppError, NotFoundError, ValidationError } from "@/lib/errors"
import { sendEmail, prospectingFrom } from "@/lib/email"
import { withAgentSignature } from "@/lib/emailSignature"
import { sanitizeEmailHtml } from "@/lib/sanitizeHtml"
import { makeUnsubscribeToken } from "@/lib/unsubscribeToken"
import { getBaseUrl } from "@/lib/utils"
import { containsPlaceholder } from "@/lib/emailPlaceholders"
import { ChiefAcquisitionAI } from "@/lib/agents/acquisition/ChiefAcquisitionAI"

import { CreativeCopywriter } from "@/lib/agents/acquisition/CreativeCopywriter"
import { eventBus } from "@/core/events"
import { DraftReviewedEvent } from "@/lib/agents/acquisition/events"

export type ActionResult = { ok: true; message: string } | { ok: false; message: string }

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

  revalidatePath("/admin/acquisition")
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
// Cœur d'envoi partagé par l'envoi unitaire ET l'envoi groupé. Applique tous
// les garde-fous (traité / email absent / désinscrit / placeholder), envoie,
// met à jour les statuts et émet l'événement. Retourne un résultat structuré
// avec une raison de skip exploitable par l'envoi groupé.
type DeliverResult =
  | { ok: true; email: string }
  | { ok: false; reason: "already" | "no_email" | "opted_out" | "placeholder" | "send_failed"; message: string }

type DraftWithLead = Prisma.EmailDraftGetPayload<{ include: { lead: true } }>

async function deliverDraft(draft: DraftWithLead): Promise<DeliverResult> {
  if (draft.status !== "PENDING_APPROVAL") {
    return { ok: false, reason: "already", message: "Déjà traité." }
  }
  if (!draft.lead.contactEmail) {
    return { ok: false, reason: "no_email", message: "Pas d'e-mail de contact." }
  }
  // Suppression : un lead désinscrit ne peut JAMAIS être recontacté (droit
  // d'opposition RGPD + réputation).
  if (draft.lead.optedOut) {
    return { ok: false, reason: "opted_out", message: "Lead désinscrit." }
  }
  // Jamais un crochet non rempli ("[nom du contact]"…) n'atteint un prospect.
  if (containsPlaceholder(draft.bodyHtml)) {
    return { ok: false, reason: "placeholder", message: "Champ non rempli ([...])." }
  }

  const unsubscribeUrl = `${getBaseUrl()}/api/unsubscribe?token=${makeUnsubscribeToken(draft.lead.id)}`

  try {
    await sendEmail({
      to: draft.lead.contactEmail,
      subject: draft.subject,
      from: prospectingFrom(),
      html: withAgentSignature(sanitizeEmailHtml(draft.bodyHtml), {
        unsubscribeUrl,
        source: draft.lead.source,
        websiteUrl: draft.lead.websiteUrl,
      }),
      // Header List-Unsubscribe volontairement NON passé (<50/jour) — signal
      // Promotions inutile ; désinscription assurée par le lien visible + STOP.
    })
  } catch (e) {
    const message = e instanceof AppError ? e.message : "Échec d'envoi inattendu."
    return { ok: false, reason: "send_failed", message }
  }

  await prisma.$transaction([
    prisma.emailDraft.update({ where: { id: draft.id }, data: { status: "SENT" } }),
    prisma.lead.update({ where: { id: draft.leadId }, data: { status: "CONTACTED", lastContactedAt: new Date() } }),
  ])
  eventBus.publish(new DraftReviewedEvent(draft.lead.id, draft.lead.companyName, "APPROVED"))
  return { ok: true, email: draft.lead.contactEmail }
}

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
      await analyst.scoreLead(id)
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
    revalidatePath("/admin/acquisition")
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
    revalidatePath("/admin/acquisition")
    return { ok: true, message: `Brouillon régénéré avec succès (ton: ${tone}).` }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur de régénération."
    return { ok: false, message }
  }
}
