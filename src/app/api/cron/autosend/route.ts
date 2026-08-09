import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { deliverDraft } from "@/lib/acquisition/deliverDraft"
import { logger } from "@/core/logger"

export const dynamic = "force-dynamic"
export const maxDuration = 300

// AUTOPILOTE d'envoi : chaque passage, envoie automatiquement les meilleurs
// brouillons (par score de lead décroissant) qui passent TOUS les garde-fous.
// Un mail non parfait (placeholder, code module Mxx, prix €) ou interdit
// (désinscrit, sans email) n'est jamais envoyé — il est retiré de la file
// (REJECTED) pour qu'il ne reste que du parfait. Plafond quotidien pour rester
// sous la limite Resend (100/j) et ménager la réputation du domaine.
//
// ⚠️ Réputation : envoyer ~100 cold/j depuis un domaine non "réchauffé" reste
// risqué (spam). Le plafond par défaut (80) laisse une marge ; à monter
// progressivement via AUTOSEND_DAILY_CAP quand le domaine est chaud.
const DAILY_CAP = Number(process.env.AUTOSEND_DAILY_CAP) || 80
const PER_RUN_CAP = 25 // borne par exécution (durée fonction)

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 500 })
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  // Combien déjà envoyés aujourd'hui (respect du plafond entre les passages).
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const sentToday = await prisma.emailDraft.count({
    where: { status: "SENT", updatedAt: { gte: startOfDay } },
  })
  const remaining = Math.min(DAILY_CAP - sentToday, PER_RUN_CAP)
  if (remaining <= 0) {
    return NextResponse.json({ status: "cap_reached", sentToday, cap: DAILY_CAP, sent: 0 })
  }

  // Meilleurs brouillons d'abord (score de lead décroissant, nulls en dernier).
  const candidates = await prisma.emailDraft.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: { lead: true },
    orderBy: [{ lead: { score: { sort: "desc", nulls: "last" } } }, { createdAt: "asc" }],
    take: remaining * 3, // marge : certains seront rejetés (non parfaits)
  })

  let sent = 0
  let rejected = 0
  for (const draft of candidates) {
    if (sent >= remaining) break
    const r = await deliverDraft(draft)
    if (r.ok) {
      sent++
    } else if (r.reason === "placeholder" || r.reason === "no_email" || r.reason === "opted_out") {
      // Non parfait / injoignable : on le sort de la file pour ne garder que du parfait.
      await prisma.emailDraft.update({ where: { id: draft.id }, data: { status: "REJECTED" } }).catch(() => {})
      rejected++
    }
    // send_failed / already : on laisse tel quel (retry au prochain passage).
  }

  logger.info(`[Autosend] ${sent} envoyé(s), ${rejected} rejeté(s) (jour: ${sentToday + sent}/${DAILY_CAP})`)
  return NextResponse.json({ status: "ok", sent, rejected, sentToday: sentToday + sent, cap: DAILY_CAP })
}
