"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireSession } from "@/lib/session"

export async function sendMessage(projectId: string, formData: FormData) {
  const session = await requireSession()

  const content = String(formData.get("content") ?? "").trim()
  if (!content) return
  if (content.length > 2000) throw new Error("Message too long")

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, clientId: true },
  })

  if (!project) throw new Error("Project not found")
  if (session.user.role !== "ADMIN" && project.clientId !== session.user.id) {
    throw new Error("Unauthorized")
  }

  await prisma.message.create({
    data: {
      content,
      projectId,
      authorId: session.user.id
    }
  })

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath(`/dashboard`)
}
