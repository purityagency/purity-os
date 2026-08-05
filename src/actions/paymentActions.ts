"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdminSession } from "@/lib/session"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"
import { createMolliePayment } from "@/lib/mollie"
import { getBaseUrl } from "@/lib/utils"
import { logger } from "@/core/logger"

// Déclenché par le client depuis /dashboard/payments — crée (ou réutilise) un
// paiement Mollie hébergé pour un Payment PENDING et redirige vers le checkout.
export async function startMolliePayment(paymentId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, project: { clientId: session.user.id } },
  })
  if (!payment) throw new Error("Payment not found")
  if (payment.status !== "PENDING") throw new Error("Payment is not pending")

  // Un checkout Mollie déjà ouvert reste valable — pas besoin d'en recréer un
  // à chaque clic (et ça éviterait de perdre la trace du premier si le client
  // revient en arrière puis reclique).
  if (payment.checkoutUrl && payment.providerPaymentId) {
    redirect(payment.checkoutUrl)
  }

  let checkoutUrl: string
  try {
    const baseUrl = getBaseUrl()
    const molliePayment = await createMolliePayment({
      amountEUR: payment.amount,
      description: `Purity Agency — Paiement ${payment.type}`,
      redirectUrl: `${baseUrl}/dashboard/payments`,
      webhookUrl: `${baseUrl}/api/webhooks/mollie`,
      paymentId: payment.id,
    })

    checkoutUrl = molliePayment._links.checkout?.href ?? ""
    if (!checkoutUrl) throw new Error("Mollie n'a renvoyé aucune URL de checkout")

    await prisma.payment.update({
      where: { id: payment.id },
      data: { provider: "MOLLIE", providerPaymentId: molliePayment.id, checkoutUrl },
    })
  } catch (err) {
    logger.error(`[startMolliePayment] Échec création paiement Mollie pour ${paymentId}`, err)
    throw new Error("Impossible de créer le paiement Mollie pour le moment")
  }

  redirect(checkoutUrl)
}

export async function markPaymentPaid(paymentId: string, projectId: string) {
  await requireAdminSession()

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, projectId },
    select: { id: true },
  })
  if (!payment) throw new Error("Payment not found")

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "PAID" },
  })

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath("/admin/payments")
  revalidatePath("/admin/clients")
  revalidatePath("/admin")
  // Le client suit ses paiements sur son espace — il doit voir le changement.
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/payments")
}

export async function markPaymentCancelled(paymentId: string, projectId: string) {
  await requireAdminSession()

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, projectId },
    select: { id: true },
  })
  if (!payment) throw new Error("Payment not found")

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "CANCELLED" },
  })

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath("/admin/payments")
  revalidatePath("/admin/clients")
  revalidatePath("/admin")
  // Le client suit ses paiements sur son espace — il doit voir le changement.
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/payments")
}
