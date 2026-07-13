"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"

export async function createProjectWithClient(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  const clientName = formData.get("clientName") as string
  const clientEmail = formData.get("clientEmail") as string
  const projectName = formData.get("projectName") as string
  const estimatedDelivery = formData.get("estimatedDelivery") as string

  // Simple validation
  if (!clientName || !clientEmail || !projectName) {
    throw new Error("Missing required fields")
  }

  // 1. Create or connect User (Client)
  const user = await prisma.user.upsert({
    where: { email: clientEmail },
    update: { name: clientName },
    create: {
      email: clientEmail,
      name: clientName,
      role: "CLIENT"
    }
  })

  // 2. Create Project
  const project = await prisma.project.create({
    data: {
      name: projectName,
      clientId: user.id,
      status: "ACTIVE",
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null
    }
  })

  revalidatePath("/admin")
  revalidatePath("/admin/projects")
  
  return project
}
