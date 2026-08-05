import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getMolliePayment } from "@/lib/mollie"
import { logger } from "@/core/logger"

export const dynamic = "force-dynamic"

const STATUS_MAP: Record<string, "PAID" | "CANCELLED" | undefined> = {
  paid: "PAID",
  canceled: "CANCELLED",
  expired: "CANCELLED",
  failed: "CANCELLED",
}

// Mollie ne transporte aucun statut ni signature dans l'appel webhook — juste
// un `id` en corps form-encoded. Le seul geste qui compte ici est de rappeler
// l'API Mollie avec notre clé secrète pour connaître le statut réel ; c'est
// cet appel authentifié qui fait office de vérification, pas le POST reçu.
export async function POST(request: Request) {
  try {
    const rawText = await request.text()
    const params = new URLSearchParams(rawText)
    const molliePaymentId = params.get("id")

    if (!molliePaymentId) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 })
    }

    const payment = await prisma.payment.findUnique({ where: { providerPaymentId: molliePaymentId } })
    if (!payment) {
      logger.error(`[Mollie webhook] Aucun Payment local pour ${molliePaymentId}`)
      return NextResponse.json({ error: "unknown_payment" }, { status: 404 })
    }

    const molliePayment = await getMolliePayment(molliePaymentId)
    const nextStatus = STATUS_MAP[molliePayment.status]

    // Idempotent : un webhook déjà traité (statut local déjà PAID/CANCELLED)
    // ou un statut Mollie encore "open"/"pending" ne déclenche aucune écriture.
    if (!nextStatus || payment.status === nextStatus) {
      return NextResponse.json({ status: "noop" })
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: nextStatus },
    })

    logger.info(`[Mollie webhook] Payment ${payment.id} → ${nextStatus}`, { molliePaymentId })
    return NextResponse.json({ status: "ok" })
  } catch (err) {
    logger.error("[Mollie webhook] Erreur de traitement", err)
    return NextResponse.json({ error: "internal_error" }, { status: 500 })
  }
}
