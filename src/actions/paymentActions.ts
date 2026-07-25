"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAdminSession } from "@/lib/session"

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
