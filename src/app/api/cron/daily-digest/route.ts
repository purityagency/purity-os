import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

export const dynamic = "force-dynamic"

/**
 * Digest quotidien envoyé à Amir — protégé par CRON_SECRET, même pattern
 * que /api/cron/acquisition. Ne s'envoie QUE s'il y a réellement quelque
 * chose à dire : un digest quotidien vide qui dit "rien à signaler" tous
 * les jours devient du bruit qu'on n'ouvre plus (même leçon que le spam
 * Sentinel nettoyé le 2026-08-03 — 1008 events "tout va bien" en base).
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré côté serveur" }, { status: 500 })
  }
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    return NextResponse.json({ error: "ADMIN_EMAIL non configuré" }, { status: 500 })
  }

  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [newEvents, pendingDraftsOld, overdueProjects, pendingPayments] = await Promise.all([
    prisma.event.count({ where: { status: "NEW", createdAt: { gte: yesterday } } }),
    prisma.emailDraft.count({ where: { status: "PENDING_APPROVAL", createdAt: { lt: yesterday } } }),
    prisma.project.count({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] }, estimatedDelivery: { lt: now } },
    }),
    prisma.payment.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: { _all: true } }),
  ])

  const pendingAmount = pendingPayments._sum.amount ?? 0
  const pendingCount = pendingPayments._count._all

  const items: string[] = []
  if (newEvents > 0) items.push(`<li><strong>${newEvents}</strong> nouvelle(s) demande(s) client depuis hier</li>`)
  if (pendingDraftsOld > 0) items.push(`<li><strong>${pendingDraftsOld}</strong> brouillon(s) d'email de prospection en attente de validation depuis plus de 24h</li>`)
  if (overdueProjects > 0) items.push(`<li><strong>${overdueProjects}</strong> projet(s) en retard sur la date de livraison estimée</li>`)
  if (pendingCount > 0) items.push(`<li><strong>${pendingCount}</strong> paiement(s) en attente, total <strong>${pendingAmount}€</strong></li>`)

  if (items.length === 0) {
    return NextResponse.json({ status: "nothing_to_report", sent: false })
  }

  const appUrl = process.env.NEXTAUTH_URL || "https://app.purity-agency.be"

  await sendEmail({
    to: adminEmail,
    subject: `Purity OS — ${items.length} point(s) d'attention aujourd'hui`,
    html: `
      <div style="font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif; color: #1a1a1a; max-width: 560px;">
        <p style="font-size: 15px;">Salut Amir, voici ce qui demande ton attention ce matin :</p>
        <ul style="font-size: 15px; line-height: 1.8;">${items.join("")}</ul>
        <p style="margin-top: 20px;">
          <a href="${appUrl}/admin" style="display: inline-block; background: #111; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-size: 14px;">Ouvrir Purity OS</a>
        </p>
      </div>
    `.trim(),
  })

  return NextResponse.json({ status: "sent", sent: true, itemCount: items.length })
}
