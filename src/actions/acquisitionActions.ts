"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAdminSession } from "@/lib/session"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { sendEmail } from "@/lib/email"

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
