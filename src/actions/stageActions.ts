"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"

export async function addStageToProject(projectId: string, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "ADMIN") throw new Error("Unauthorized")

  const title = formData.get("title") as string
  const description = formData.get("description") as string

  if (!title) throw new Error("Title is required")

  // Get current max orderIndex
  const maxStage = await prisma.stage.findFirst({
    where: { projectId },
    orderBy: { orderIndex: 'desc' }
  })
  
  const orderIndex = maxStage ? maxStage.orderIndex + 1 : 0

  await prisma.stage.create({
    data: {
      title,
      description,
      projectId,
      orderIndex,
      status: "PENDING"
    }
  })

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath(`/dashboard`)
}

export async function updateStageStatus(stageId: string, projectId: string, status: string) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "ADMIN") throw new Error("Unauthorized")

  await prisma.stage.update({
    where: { id: stageId },
    data: { status }
  })

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath(`/dashboard`)
}
