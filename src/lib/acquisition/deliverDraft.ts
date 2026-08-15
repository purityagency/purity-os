import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { AppError } from "@/lib/errors"
import { sendEmail, prospectingFrom } from "@/lib/email"
import { withAgentSignature } from "@/lib/emailSignature"
import { sanitizeEmailHtml } from "@/lib/sanitizeHtml"
import { makeUnsubscribeToken } from "@/lib/unsubscribeToken"
import { getBaseUrl } from "@/lib/utils"
import { containsPlaceholder } from "@/lib/emailPlaceholders"
import { injectEmailTracking } from "@/lib/acquisition/emailTracking"
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

  // "engaged" (petit logo, mise en page plus soignée) dès qu'on répond sur un
  // fil déjà ouvert par le prospect (relance ou réponse à sa réponse) — "cold"
  // (sobre, sans image) uniquement pour le tout premier contact non sollicité.
  // Déduit de `tone` (pas de nouveau champ de schéma) : voir CreativeCopywriter.ts.
  const variant: "cold" | "engaged" = /Relance|Réponse/.test(draft.tone) ? "engaged" : "cold"

  let providerId: string | null = null
  try {
    const r = await sendEmail({
      to: draft.lead.contactEmail,
      subject: draft.subject,
      from: prospectingFrom(),
      bccSelf: false,
      // Ordre : on assainit le corps, on injecte le tracking (pixel + liens
      // tracés) sur ce corps, PUIS on ajoute la signature — la désinscription
      // et les liens de signature ne sont jamais tracés.
      html: withAgentSignature(injectEmailTracking(sanitizeEmailHtml(draft.bodyHtml), draft.id), {
        unsubscribeUrl,
        source: draft.lead.source,
        websiteUrl: draft.lead.websiteUrl,
        variant,
      }),
    })
    providerId = r?.providerId ?? null
  } catch (e) {
    const message = e instanceof AppError ? e.message : "Échec d'envoi inattendu."
    return { ok: false, reason: "send_failed", message }
  }

  await prisma.$transaction([
    // deliveryStatus = "sent" : Resend a accepté. Il passera à "delivered" /
    // "bounced" quand le webhook Resend confirmera le sort réel de l'email.
    prisma.emailDraft.update({ where: { id: draft.id }, data: { status: "SENT", providerId, deliveryStatus: "sent" } }),
    prisma.lead.update({ where: { id: draft.leadId }, data: { status: "CONTACTED", lastContactedAt: new Date() } }),
  ])
  eventBus.publish(new DraftReviewedEvent(draft.lead.id, draft.lead.companyName, "APPROVED"))
  return { ok: true, email: draft.lead.contactEmail }
}
