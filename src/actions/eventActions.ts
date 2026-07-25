"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdminSession } from "@/lib/session"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { issuePasswordSetToken } from "@/lib/passwordSetToken"
import { sendEmail } from "@/lib/email"

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char)
}

function revalidateInbox() {
  revalidatePath("/admin/inbox")
  revalidatePath("/admin")
}

export async function markEventSeen(eventId: string) {
  await requireAdminSession()

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, status: true } })
  if (!event) throw new NotFoundError("Demande")
  if (event.status === "NEW") {
    await prisma.event.update({ where: { id: event.id }, data: { status: "SEEN", seenAt: new Date() } })
  }

  revalidateInbox()
}

export async function markEventDone(eventId: string) {
  await requireAdminSession()

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } })
  if (!event) throw new NotFoundError("Demande")

  await prisma.event.update({ where: { id: event.id }, data: { status: "DONE", seenAt: new Date() } })

  revalidateInbox()
}

export async function reopenEvent(eventId: string) {
  await requireAdminSession()

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } })
  if (!event) throw new NotFoundError("Demande")

  await prisma.event.update({ where: { id: event.id }, data: { status: "NEW", seenAt: null } })

  revalidateInbox()
}

/**
 * Convertit une demande entrante (lead / RDV) en client + projet, et envoie au
 * client son lien d'accès à l'espace. C'est le lien manquant entre la boîte de
 * réception et le reste de l'OS : une demande devient un dossier suivable.
 *
 * Idempotent sur l'email : un client existant est réutilisé, jamais dupliqué.
 * Les commandes payées (type ORDER) passent déjà par /api/internal/provision et
 * ont donc déjà leur projet — on ne les convertit pas une seconde fois.
 */
export async function convertEventToProject(eventId: string, formData: FormData) {
  await requireAdminSession()

  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) throw new NotFoundError("Demande")
  if (event.projectId) throw new ValidationError("Cette demande est déjà rattachée à un projet")

  const email = String(formData.get("email") ?? event.email ?? "").trim().toLowerCase()
  const name = String(formData.get("name") ?? event.name ?? "").trim()
  const projectName = String(formData.get("projectName") ?? "").trim()

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ValidationError("Adresse e-mail invalide")
  if (!name) throw new ValidationError("Le nom du client est obligatoire")
  if (!projectName) throw new ValidationError("Le nom du projet est obligatoire")
  if (projectName.length > 200) throw new ValidationError("Nom de projet trop long")

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } })

  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name, role: "CLIENT" },
  })

  // `sector` attend un slug métier (horeca, coiffure…), pas un nom d'entreprise :
  // on ne le devine pas ici, l'admin le renseignera depuis la fiche projet.
  const project = await prisma.project.create({
    data: {
      clientId: user.id,
      name: projectName,
      status: "ACTIVE",
    },
  })

  await prisma.event.update({
    where: { id: event.id },
    data: { projectId: project.id, status: "DONE", seenAt: new Date() },
  })

  // Lien d'accès uniquement pour un compte qui n'en a pas encore un actif —
  // ne jamais réinitialiser silencieusement le mot de passe d'un client existant.
  if (!existingUser?.passwordHash) {
    const rawToken = await issuePasswordSetToken(user.id)
    const baseUrl = process.env.PORTAL_BASE_URL || process.env.NEXTAUTH_URL || ""
    await sendEmail({
      to: email,
      subject: "Votre espace client Purity Agency est prêt",
      html: `<p>Bonjour ${escapeHtml(name)},</p><p>Votre projet <strong>${escapeHtml(projectName)}</strong> a été créé. Définissez votre mot de passe pour suivre son avancement :</p><p><a href="${baseUrl}/set-password?token=${encodeURIComponent(rawToken)}">Définir mon mot de passe</a></p><p>Ce lien expire dans 48h.</p>`,
    }).catch((err) => {
      // L'échec d'envoi ne doit pas annuler la création du dossier — l'admin
      // peut relancer l'invitation depuis la fiche client.
      console.error("[convert-event] invite email failed", err)
    })
  }

  revalidateInbox()
  revalidatePath("/admin/projects")
  revalidatePath("/admin/clients")

  redirect(`/admin/projects/${project.id}`)
}
