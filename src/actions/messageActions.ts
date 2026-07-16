"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireSession } from "@/lib/session"
import { sendEmail } from "@/lib/email"

export async function sendMessage(projectId: string, formData: FormData) {
  const session = await requireSession()

  const content = String(formData.get("content") ?? "").trim()
  if (!content) return
  if (content.length > 2000) throw new Error("Message too long")

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, clientId: true, client: { select: { email: true, name: true } } },
  })

  if (!project) throw new Error("Project not found")
  const isAdmin = session.user.role === "ADMIN"
  if (!isAdmin && project.clientId !== session.user.id) {
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

  // Notification : le client écrit → prévenir l'équipe. L'équipe répond → prévenir le client.
  const portalUrl = process.env.NEXTAUTH_URL || ""
  if (isAdmin) {
    if (project.client.email) {
      await sendEmail({
        to: project.client.email,
        subject: `Nouveau message — ${project.name}`,
        html: `<p>Bonjour ${project.client.name ?? ""},</p><p>L'équipe Purity Agency vous a répondu sur votre projet <strong>${project.name}</strong> :</p><blockquote>${content}</blockquote><p><a href="${portalUrl}/dashboard">Voir la conversation</a></p>`,
      })
    }
  } else {
    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `Nouveau message client — ${project.name}`,
        html: `<p>Un client a écrit sur le projet <strong>${project.name}</strong> :</p><blockquote>${content}</blockquote><p><a href="${portalUrl}/admin/projects/${projectId}">Répondre</a></p>`,
      })
    }
  }
}
