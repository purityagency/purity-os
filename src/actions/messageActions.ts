"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"

export async function sendMessage(projectId: string, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) throw new Error("Unauthorized")

  const content = formData.get("content") as string
  if (!content || content.trim() === "") return

  const userId = (session.user as any).id

  await prisma.message.create({
    data: {
      content,
      projectId,
      authorId: userId
    }
  })

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath(`/dashboard`)
}
