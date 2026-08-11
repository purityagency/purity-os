import { NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { logger } from "@/core/logger"

export const dynamic = "force-dynamic"

// Webhook Resend : relie les livrables de l'admin aux résultats RÉELS de Resend.
// Resend appelle cet endpoint à chaque événement (delivered/bounced/complained/
// opened/clicked). On met à jour EmailDraft par providerId → l'Outbox affiche le
// vrai sort de chaque email, plus seulement "accepté par Resend".
//
// Signature : Resend utilise Svix. On vérifie sans dépendance (HMAC-SHA256 sur
// `${svix-id}.${svix-timestamp}.${body}`, clé = base64 après "whsec_").

function verifySvix(body: string, headers: Headers, secret: string): boolean {
  const id = headers.get("svix-id")
  const timestamp = headers.get("svix-timestamp")
  const sigHeader = headers.get("svix-signature")
  if (!id || !timestamp || !sigHeader) return false

  // Rejet si l'horodatage dérive de plus de 5 min (anti-rejeu).
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64")
  const expected = crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64")
  // L'en-tête peut contenir plusieurs signatures "v1,<sig> v1,<sig>".
  for (const part of sigHeader.split(" ")) {
    const sig = part.split(",")[1]
    if (!sig) continue
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true
  }
  return false
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: "RESEND_WEBHOOK_SECRET non configuré" }, { status: 500 })
  }

  const body = await request.text()
  if (!verifySvix(body, request.headers, secret)) {
    return NextResponse.json({ error: "signature invalide" }, { status: 401 })
  }

  let event: { type?: string; data?: { email_id?: string; bounce?: { message?: string } } }
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: "payload invalide" }, { status: 400 })
  }

  const providerId = event.data?.email_id
  const type = event.type
  if (!providerId || !type) return NextResponse.json({ status: "ignored" })

  // Mapping événement Resend → statut de livraison. On ne "recule" jamais un
  // statut (un delivered ne redevient pas sent).
  const now = new Date()
  const data: Record<string, unknown> = {}
  switch (type) {
    case "email.delivered":
      data.deliveryStatus = "delivered"
      data.deliveredAt = now
      break
    case "email.bounced":
      data.deliveryStatus = "bounced"
      data.bouncedAt = now
      data.bounceReason = event.data?.bounce?.message ?? "Rebond (adresse invalide ou boîte pleine)"
      break
    case "email.complained":
      data.deliveryStatus = "complained"
      break
    case "email.delivery_delayed":
      data.deliveryStatus = "delivery_delayed"
      break
    // opened / clicked : déjà couverts par notre pixel/lien tracés, on ignore
    // pour ne pas dupliquer les compteurs.
    default:
      return NextResponse.json({ status: "ignored", type })
  }

  try {
    const r = await prisma.emailDraft.updateMany({ where: { providerId }, data })
    logger.info(`[ResendWebhook] ${type} → ${JSON.stringify(data)} (${r.count} maj)`)
  } catch (e) {
    logger.error(`[ResendWebhook] échec maj pour ${providerId}`, e)
  }

  return NextResponse.json({ status: "ok" })
}
