"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAdminSession } from "@/lib/session"
import { sendEmail } from "@/lib/email"
import { getBaseUrl } from "@/lib/utils"

const VALID_STAGE_STATUSES = ["PENDING", "IN_PROGRESS", "WAITING_CLIENT", "BLOCKED", "REVIEW", "COMPLETED"] as const
type StageStatus = (typeof VALID_STAGE_STATUSES)[number]

export async function addStageToProject(projectId: string, formData: FormData) {
  await requireAdminSession()

  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()

  if (!title) throw new Error("Title is required")
  if (title.length > 120) throw new Error("Title too long")
  if (description.length > 500) throw new Error("Description too long")

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  })
  if (!project) throw new Error("Project not found")

  const maxStage = await prisma.stage.findFirst({
    where: { projectId },
    orderBy: { orderIndex: 'desc' }
  })
  
  const orderIndex = maxStage ? maxStage.orderIndex + 1 : 0

  await prisma.stage.create({
    data: {
      title,
      description: description || null,
      projectId,
      orderIndex,
      status: "PENDING"
    }
  })

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath("/admin")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/timeline")
}

export async function updateStageStatus(stageId: string, projectId: string, status: string) {
  await requireAdminSession()
  if (!VALID_STAGE_STATUSES.includes(status as StageStatus)) throw new Error("Invalid status")

  const stage = await prisma.stage.findFirst({
    where: { id: stageId, projectId },
    select: { id: true, title: true },
  })
  if (!stage) throw new Error("Stage not found")

  await prisma.stage.update({
    where: { id: stage.id },
    data: { status: status as StageStatus }
  })

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath("/admin")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/timeline")

  if (status === "BLOCKED") {
    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } })
      const portalUrl = getBaseUrl()
      await sendEmail({
        to: adminEmail,
        subject: `Étape bloquée — ${project?.name ?? projectId}`,
        html: `<p>L'étape <strong>${stage.title}</strong> du projet <strong>${project?.name ?? ""}</strong> est passée en statut <strong>Bloquée</strong>.</p><p><a href="${portalUrl}/admin/projects/${projectId}">Voir le projet</a></p>`,
      })
    }
  }
}
