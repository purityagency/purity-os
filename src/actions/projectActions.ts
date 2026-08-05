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
  // Le compte + projet sont déjà créés en base à ce stade : un échec d'envoi
  // (domaine Resend non vérifié, réseau...) ne doit pas faire planter l'action
  // et laisser l'admin croire que rien n'a été créé. On logge fort (console +
  // Event visible dans /admin/inbox) au lieu de rethrow, avec le bouton
  // "Renvoyer un lien d'accès" (resendClientInvite) comme filet de rattrapage.
  try {
    await sendEmail({
      to: clientEmail,
      subject: "Votre accès Purity Agency",
      html: `<p>Bonjour ${escapeHtml(clientName)},</p><p>Votre espace client est prêt.</p><p><a href="${baseUrl}/set-password?token=${encodeURIComponent(token)}">Définir votre mot de passe</a></p><p>Ce lien expire dans 48 heures.</p>`,
    })
  } catch (err) {
    console.error("[createProjectWithClient] envoi email échoué", err)
    await prisma.event.create({
      data: {
        type: "SYSTEM",
        name: clientName,
        email: clientEmail,
        summary: `Compte créé pour "${projectName}" mais l'email d'accès n'est pas parti — à renvoyer depuis la fiche client`,
        payload: { error: err instanceof Error ? err.message : String(err) },
      },
    }).catch(() => {})
  }

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
  revalidatePath("/admin/clients")
  revalidatePath("/admin")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/timeline")
}

export async function updateProjectDetails(projectId: string, formData: FormData) {
  await requireAdminSession()

  const name = String(formData.get("name") ?? "").trim()
  const estimatedDelivery = String(formData.get("estimatedDelivery") ?? "").trim()
  const liveUrlRaw = String(formData.get("liveUrl") ?? "").trim()

  if (!name) throw new Error("Name is required")
  if (name.length > 200) throw new Error("Name too long")

  let deliveryDate: Date | null = null
  if (estimatedDelivery) {
    deliveryDate = new Date(estimatedDelivery)
    if (Number.isNaN(deliveryDate.getTime())) throw new Error("Invalid delivery date")
  }

  let liveUrl: string | null = null
  if (liveUrlRaw) {
    if (!/^https?:\/\/[^/\s]+/i.test(liveUrlRaw)) throw new Error("Invalid live URL")
    liveUrl = liveUrlRaw
  }

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
  if (!project) throw new Error("Project not found")

  await prisma.project.update({
    where: { id: projectId },
    data: { name, estimatedDelivery: deliveryDate, liveUrl },
  })

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath("/admin/projects")
  revalidatePath("/admin/clients")
  // Le client voit le nom du projet et la date de livraison sur son tableau de
  // bord — sans ceci il restait sur la version en cache après modification.
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/timeline")
}
