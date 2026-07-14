"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { hashPassword, sanitizeEmailInput, sanitizePasswordInput } from "@/lib/auth"
import { requireAdminSession } from "@/lib/session"

export async function createProjectWithClient(formData: FormData) {
  await requireAdminSession()

  const clientName = String(formData.get("clientName") ?? "").trim()
  const clientEmail = sanitizeEmailInput(formData.get("clientEmail"))
  const clientPassword = sanitizePasswordInput(formData.get("clientPassword"))
  const projectName = String(formData.get("projectName") ?? "").trim()
  const estimatedDelivery = String(formData.get("estimatedDelivery") ?? "").trim()

  if (!clientName || !clientEmail || !projectName || !clientPassword) {
    throw new Error("Missing required fields")
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clientEmail)) throw new Error("Invalid email")
  if (clientPassword.length < 10) throw new Error("Password too short")

  let deliveryDate: Date | null = null
  if (estimatedDelivery) {
    deliveryDate = new Date(estimatedDelivery)
    if (Number.isNaN(deliveryDate.getTime())) throw new Error("Invalid delivery date")
  }

  const user = await prisma.user.upsert({
    where: { email: clientEmail },
    update: {
      name: clientName,
      role: "CLIENT",
      passwordHash: hashPassword(clientPassword),
    },
    create: {
      email: clientEmail,
      name: clientName,
      role: "CLIENT",
      passwordHash: hashPassword(clientPassword),
    }
  })

  await prisma.project.create({
    data: {
      name: projectName,
      clientId: user.id,
      status: "ACTIVE",
      estimatedDelivery: deliveryDate
    }
  })

  revalidatePath("/admin")
  revalidatePath("/admin/projects")
}
