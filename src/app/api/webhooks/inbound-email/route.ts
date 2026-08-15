import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { logger } from "@/core/logger"
import { eventBus } from "@/core/events"
import { LeadRepliedEvent } from "@/lib/agents/acquisition/events"
import { classifyReply } from "@/lib/acquisition/replyClassifier"
import crypto from "crypto"

export const dynamic = "force-dynamic"

// Reçoit les emails ENTRANTS via le Worker Cloudflare Email Routing (voir
// infra Cloudflare — worker ajouté EN PLUS de la règle de forward existante
// vers contact.purityagency@gmail.com, jamais à la place : le Gmail réel doit
// continuer à recevoir chaque email quoi qu'il arrive ici).
//
// Boucle fermée : classification déterministe (opt_out / auto_reply /
// interested / objection / other) AVANT toute action, pour ne jamais couper
// une relance sur un simple auto-répondeur, et pour toujours respecter un
// "stop" (RGPD/ePrivacy — voir classifyReply.ts).
//
// Auth : secret partagé dans l'en-tête X-Webhook-Secret. Comparaison à temps constant.

function authorized(request: Request): boolean {
  const provided = request.headers.get("x-webhook-secret") || ""
  const expected = process.env.INBOUND_EMAIL_SECRET || process.env.INTERNAL_API_SECRET || ""
  if (!expected) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Extrait l'adresse email d'un champ "From" éventuellement formaté
// ("Jean Dupont <jean@x.be>").
function parseFromAddress(from: string): string | null {
  const m = from.match(/<([^>]+)>/)
  const addr = (m ? m[1] : from).trim().toLowerCase()
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr) ? addr : null
}

// Le Worker envoie le texte brut si disponible, sinon le HTML (on retire les
// balises nous-mêmes plutôt que d'exiger un parseur MIME côté Worker).
function extractText(body: { text?: string; html?: string }): string {
  if (body.text && body.text.trim()) return body.text.trim()
  if (body.html) return body.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  return ""
}

interface InboundReplyEntry {
  receivedAt: string
  fromEmail: string
  subject: string
  text: string
  intent: string
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: { from?: string; to?: string; subject?: string; text?: string; html?: string; headers?: Record<string, string> } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const fromAddr = body.from ? parseFromAddress(body.from) : null
  if (!fromAddr) {
    return NextResponse.json({ status: "ignored", reason: "no_from" })
  }

  // Retrouve le lead par email de contact (l'expéditeur de la réponse).
  const lead = await prisma.lead.findFirst({
    where: { contactEmail: { equals: fromAddr, mode: "insensitive" } },
    orderBy: { updatedAt: "desc" },
  })

  if (!lead) {
    // Pas un lead connu (client existant, spam, etc.) — le forward Cloudflare
    // a déjà fait son travail vers Gmail, on ne fait rien de plus ici.
    return NextResponse.json({ status: "ignored", reason: "not_a_lead" })
  }

  const subject = body.subject ?? ""
  const text = extractText(body)
  const intent = classifyReply(text, subject, body.headers)

  const existingAudit = (lead.auditData as Record<string, unknown> | null) ?? {}
  const priorReplies = Array.isArray(existingAudit.inboundReplies) ? (existingAudit.inboundReplies as InboundReplyEntry[]) : []
  const replyEntry: InboundReplyEntry = { receivedAt: new Date().toISOString(), fromEmail: fromAddr, subject, text, intent }
  const mergedAudit = { ...existingAudit, inboundReplies: [...priorReplies, replyEntry] }

  // Désinscription explicite — priorité absolue, ne dépend pas du statut actuel.
  if (intent === "opt_out") {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { optedOut: true, optedOutAt: new Date(), auditData: mergedAudit as unknown as Prisma.InputJsonValue },
    })
    await prisma.event.create({
      data: { type: "AI", name: lead.contactName, email: fromAddr, company: lead.companyName, summary: `Désinscription demandée par ${lead.companyName} — lead exclu définitivement`, payload: { leadId: lead.id, subject } },
    }).catch(() => {})
    logger.info(`[inbound-email] Lead ${lead.id} (${lead.companyName}) → OPT_OUT`, { from: fromAddr })
    return NextResponse.json({ status: "ok", leadId: lead.id, intent })
  }

  // Auto-répondeur (absence, out-of-office) — on trace, mais on NE coupe PAS
  // les relances (ce n'est pas une vraie réponse humaine).
  if (intent === "auto_reply") {
    await prisma.lead.update({ where: { id: lead.id }, data: { auditData: mergedAudit as unknown as Prisma.InputJsonValue } })
    logger.info(`[inbound-email] Lead ${lead.id} (${lead.companyName}) → auto-réponse ignorée`, { from: fromAddr })
    return NextResponse.json({ status: "ok", leadId: lead.id, intent })
  }

  // Réponse humaine réelle (interested/objection/other) — coupe les relances,
  // ne rétrograde jamais un lead déjà plus avancé (RDV pris).
  const newStatus = lead.status === "MEETING_BOOKED" ? lead.status : "REPLIED"
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: newStatus, auditData: mergedAudit as unknown as Prisma.InputJsonValue },
  })

  await prisma.event.create({
    data: { type: "AI", name: lead.contactName, email: fromAddr, company: lead.companyName, summary: `Réponse reçue de ${lead.companyName} (${intent}) — relances coupées`, payload: { leadId: lead.id, subject, intent } },
  }).catch(() => {})

  // Manon prépare une réponse — jamais si le lead a déjà un RDV (on ne veut
  // pas qu'un brouillon parte tout seul sur un dossier déjà gagné).
  if (newStatus === "REPLIED") {
    eventBus.publish(new LeadRepliedEvent(lead.id, text, subject))
  }

  logger.info(`[inbound-email] Lead ${lead.id} (${lead.companyName}) → ${newStatus} (${intent})`, { from: fromAddr })
  return NextResponse.json({ status: "ok", leadId: lead.id, intent })
}
