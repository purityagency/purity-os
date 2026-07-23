"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { sanitizeEmailInput } from "@/lib/auth"
import { requireAdminSession } from "@/lib/session"
import { issuePasswordSetToken } from "@/lib/passwordSetToken"
import { sendEmail } from "@/lib/email"

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char)
}

export async function createProjectWithClient(formData: FormData) {
  await requireAdminSession()

  const clientName = String(formData.get("clientName") ?? "").trim()
  const clientEmail = sanitizeEmailInput(formData.get("clientEmail"))
  const projectName = String(formData.get("projectName") ?? "").trim()
  const estimatedDelivery = String(formData.get("estimatedDelivery") ?? "").trim()

  if (!clientName || !clientEmail || !projectName) {
    throw new Error("Missing required fields")
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clientEmail)) throw new Error("Invalid email")

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
    },
    create: {
      email: clientEmail,
      name: clientName,
      role: "CLIENT",
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

  const token = await issuePasswordSetToken(user.id)
  const baseUrl = process.env.PORTAL_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3001"
  await sendEmail({
    to: clientEmail,
    subject: "Votre accès Purity Agency",
    html: `<p>Bonjour ${escapeHtml(clientName)},</p><p>Votre espace client est prêt.</p><p><a href="${baseUrl}/set-password?token=${encodeURIComponent(token)}">Définir votre mot de passe</a></p><p>Ce lien expire dans 48 heures.</p>`,
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
