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

const VALID_PROJECT_STATUSES = ["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const
type ProjectStatus = (typeof VALID_PROJECT_STATUSES)[number]

export async function updateProjectStatus(projectId: string, status: string) {
  await requireAdminSession()
  if (!VALID_PROJECT_STATUSES.includes(status as ProjectStatus)) throw new Error("Invalid status")

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
  if (!project) throw new Error("Project not found")

  await prisma.project.update({
    where: { id: projectId },
    data: { status: status as ProjectStatus },
  })

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath("/admin/projects")
  revalidatePath("/admin")
  revalidatePath("/dashboard")
}

export async function updateProjectDetails(projectId: string, formData: FormData) {
  await requireAdminSession()

  const name = String(formData.get("name") ?? "").trim()
  const estimatedDelivery = String(formData.get("estimatedDelivery") ?? "").trim()

  if (!name) throw new Error("Name is required")
  if (name.length > 200) throw new Error("Name too long")

  let deliveryDate: Date | null = null
  if (estimatedDelivery) {
    deliveryDate = new Date(estimatedDelivery)
    if (Number.isNaN(deliveryDate.getTime())) throw new Error("Invalid delivery date")
  }

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
  if (!project) throw new Error("Project not found")

  await prisma.project.update({
    where: { id: projectId },
    data: { name, estimatedDelivery: deliveryDate },
  })

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath("/admin/projects")
}
