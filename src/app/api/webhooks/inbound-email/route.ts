import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/core/logger"
import crypto from "crypto"

export const dynamic = "force-dynamic"

// Reçoit les emails ENTRANTS via le Worker Cloudflare Email Routing (voir
// infra Cloudflare). Quand un prospect répond, on marque son lead REPLIED :
// ça le sort du statut CONTACTED, donc il ne reçoit PLUS de relance (le cron
// ne cible que les CONTACTED). Fermeture réelle de la boucle.
//
// Auth : secret partagé dans l'en-tête X-Webhook-Secret (le Worker le connaît
// via une variable d'environnement Cloudflare). Comparaison à temps constant.

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

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: { from?: string; to?: string; subject?: string } = {}
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
    // Pas un lead connu (client existant, spam, etc.) — le Worker a déjà
    // forwardé vers Gmail, on ne fait rien de plus ici.
    return NextResponse.json({ status: "ignored", reason: "not_a_lead" })
  }

  // Ne pas rétrograder un lead déjà plus avancé (RDV pris).
  if (lead.status === "MEETING_BOOKED") {
    return NextResponse.json({ status: "noop", reason: "already_meeting" })
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: "REPLIED" },
  })

  // Trace dans la boîte de réception admin (fil d'activité).
  await prisma.event
    .create({
      data: {
        type: "AI",
        name: lead.contactName,
        email: fromAddr,
        company: lead.companyName,
        summary: `Réponse reçue de ${lead.companyName} — relances coupées`,
        payload: { leadId: lead.id, subject: body.subject ?? "" },
      },
    })
    .catch(() => {})

  logger.info(`[inbound-email] Lead ${lead.id} (${lead.companyName}) → REPLIED`, { from: fromAddr })
  return NextResponse.json({ status: "ok", leadId: lead.id })
}
