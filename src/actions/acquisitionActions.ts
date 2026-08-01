"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAdminSession } from "@/lib/session"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { sendEmail } from "@/lib/email"
import { ChiefAcquisitionAI } from "@/lib/agents/acquisition/ChiefAcquisitionAI"

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
 * d'envoi silencieux vers une adresse absente.
 */
export async function approveAndSendDraft(draftId: string) {
  await requireAdminSession()

  const draft = await prisma.emailDraft.findUnique({
    where: { id: draftId },
    include: { lead: true },
  })
  if (!draft) throw new NotFoundError("Brouillon")
  if (draft.status !== "PENDING_APPROVAL") {
    throw new ValidationError("Ce brouillon a déjà été traité")
  }
  if (!draft.lead.contactEmail) {
    throw new ValidationError("Ce lead n'a pas d'e-mail de contact — impossible d'envoyer")
  }

  await sendEmail({
    to: draft.lead.contactEmail,
    subject: draft.subject,
    html: draft.bodyHtml,
  })

  await prisma.$transaction([
    prisma.emailDraft.update({ where: { id: draft.id }, data: { status: "SENT" } }),
    prisma.lead.update({ where: { id: draft.leadId }, data: { status: "CONTACTED" } }),
  ])

  revalidatePath("/admin/acquisition")
}

export async function rejectDraft(draftId: string) {
  await requireAdminSession()

  const draft = await prisma.emailDraft.findUnique({ where: { id: draftId }, select: { id: true, status: true } })
  if (!draft) throw new NotFoundError("Brouillon")
  if (draft.status !== "PENDING_APPROVAL") {
    throw new ValidationError("Ce brouillon a déjà été traité")
  }

  await prisma.emailDraft.update({ where: { id: draft.id }, data: { status: "REJECTED" } })

  revalidatePath("/admin/acquisition")
}
