"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAdminSession } from "@/lib/session"
import { AppError, NotFoundError, ValidationError } from "@/lib/errors"
import { sendEmail } from "@/lib/email"
import { withAgentSignature } from "@/lib/emailSignature"
import { sanitizeEmailHtml } from "@/lib/sanitizeHtml"
import { ChiefAcquisitionAI } from "@/lib/agents/acquisition/ChiefAcquisitionAI"

import { CreativeCopywriter } from "@/lib/agents/acquisition/CreativeCopywriter"

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
export async function approveAndSendDraft(draftId: string, _prevState: ActionResult | null): Promise<ActionResult> {
  await requireAdminSession()

  const draft = await prisma.emailDraft.findUnique({
    where: { id: draftId },
    include: { lead: true },
  })
  if (!draft) throw new NotFoundError("Brouillon")
  if (draft.status !== "PENDING_APPROVAL") {
    return { ok: false, message: "Ce brouillon a déjà été traité." }
  }
  if (!draft.lead.contactEmail) {
    return { ok: false, message: "Ce lead n'a pas d'e-mail de contact — impossible d'envoyer." }
  }

  try {
    await sendEmail({
      to: draft.lead.contactEmail,
      subject: draft.subject,
      html: withAgentSignature(sanitizeEmailHtml(draft.bodyHtml)),
    })
  } catch (e) {
    const message = e instanceof AppError ? e.message : "Échec d'envoi inattendu — voir les logs serveur."
    return { ok: false, message: `Email NON envoyé : ${message}` }
  }

  await prisma.$transaction([
    prisma.emailDraft.update({ where: { id: draft.id }, data: { status: "SENT" } }),
    prisma.lead.update({ where: { id: draft.leadId }, data: { status: "CONTACTED" } }),
  ])

  revalidatePath("/admin/acquisition")
  return { ok: true, message: `Email envoyé à ${draft.lead.contactEmail}.` }
}

export async function rejectDraft(draftId: string, _prevState: ActionResult | null): Promise<ActionResult> {
  await requireAdminSession()

  const draft = await prisma.emailDraft.findUnique({ where: { id: draftId }, select: { id: true, status: true } })
  if (!draft) throw new NotFoundError("Brouillon")
  if (draft.status !== "PENDING_APPROVAL") {
    return { ok: false, message: "Ce brouillon a déjà été traité." }
  }

  await prisma.emailDraft.update({ where: { id: draft.id }, data: { status: "REJECTED" } })

  revalidatePath("/admin/acquisition")
  return { ok: true, message: "Brouillon rejeté." }
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
