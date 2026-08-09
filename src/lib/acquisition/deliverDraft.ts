import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { AppError } from "@/lib/errors"
import { sendEmail, prospectingFrom } from "@/lib/email"
import { withAgentSignature } from "@/lib/emailSignature"
import { sanitizeEmailHtml } from "@/lib/sanitizeHtml"
import { makeUnsubscribeToken } from "@/lib/unsubscribeToken"
import { getBaseUrl } from "@/lib/utils"
import { containsPlaceholder } from "@/lib/emailPlaceholders"
import { eventBus } from "@/core/events"
import { DraftReviewedEvent } from "@/lib/agents/acquisition/events"

// Cœur d'envoi d'un brouillon de prospection — partagé par l'envoi manuel
// (approveAndSendDraft), groupé (bulkApproveAndSend) ET l'autopilote
// (/api/cron/autosend). Applique TOUS les garde-fous avant d'envoyer : un mail
// non parfait (placeholder, code module, prix €) ou interdit (désinscrit, sans
// email) ne part JAMAIS. C'est la garantie code, pas le prompt.

export type DeliverResult =
  | { ok: true; email: string }
  | { ok: false; reason: "already" | "no_email" | "opted_out" | "placeholder" | "send_failed"; message: string }

export type DraftWithLead = Prisma.EmailDraftGetPayload<{ include: { lead: true } }>

export async function deliverDraft(draft: DraftWithLead): Promise<DeliverResult> {
  if (draft.status !== "PENDING_APPROVAL") {
    return { ok: false, reason: "already", message: "Déjà traité." }
  }
  if (!draft.lead.contactEmail) {
    return { ok: false, reason: "no_email", message: "Pas d'e-mail de contact." }
  }
  if (draft.lead.optedOut) {
    return { ok: false, reason: "opted_out", message: "Lead désinscrit." }
  }
  // Contenu non parfait (placeholder, code module Mxx, prix €…) : bloqué.
  if (containsPlaceholder(draft.bodyHtml)) {
    return { ok: false, reason: "placeholder", message: "Contenu non conforme (placeholder / code module / prix)." }
  }

  const unsubscribeUrl = `${getBaseUrl()}/api/unsubscribe?token=${makeUnsubscribeToken(draft.lead.id)}`

  try {
    await sendEmail({
      to: draft.lead.contactEmail,
      subject: draft.subject,
      from: prospectingFrom(),
      bccSelf: false,
      html: withAgentSignature(sanitizeEmailHtml(draft.bodyHtml), {
        unsubscribeUrl,
        source: draft.lead.source,
        websiteUrl: draft.lead.websiteUrl,
      }),
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
