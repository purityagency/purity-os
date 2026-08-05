"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAdminSession } from "@/lib/session"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { issuePasswordSetToken } from "@/lib/passwordSetToken"
import { sendEmail } from "@/lib/email"
import { getBaseUrl } from "@/lib/utils"

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char)
}

/**
 * Renvoie au client un lien "définir mon mot de passe". Utile quand l'e-mail
 * d'origine est perdu, expiré, ou que la première tentative d'envoi a échoué.
 * Émettre un nouveau token n'invalide pas l'ancien mais le remplace en pratique :
 * le premier consommé gagne, les deux expirent sous 48h.
 */
export async function resendClientInvite(userId: string) {
  await requireAdminSession()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  })
  if (!user) throw new NotFoundError("Client")
  if (user.role !== "CLIENT") throw new ValidationError("Ce compte n'est pas un compte client")

  const rawToken = await issuePasswordSetToken(user.id)
  const baseUrl = getBaseUrl()

  try {
    await sendEmail({
      to: user.email,
      subject: "Votre accès à l'espace client Purity Agency",
      html: `<p>Bonjour ${escapeHtml(user.name ?? "")},</p><p>Voici votre lien pour définir votre mot de passe et accéder à votre espace client :</p><p><a href="${baseUrl}/set-password?token=${encodeURIComponent(rawToken)}">Définir mon mot de passe</a></p><p>Ce lien expire dans 48h.</p>`,
    })
  } catch (err) {
    console.error("[resendClientInvite] envoi email échoué", err)
    await prisma.event.create({
      data: {
        type: "SYSTEM",
        name: user.name,
        email: user.email,
        summary: `Renvoi du lien d'accès échoué pour ${user.email}`,
        payload: { error: err instanceof Error ? err.message : String(err) },
      },
    }).catch(() => {})
    throw err
  }

  revalidatePath(`/admin/clients/${userId}`)
}

export async function updateClientDetails(userId: string, formData: FormData) {
  await requireAdminSession()

  const name = String(formData.get("name") ?? "").trim()
  if (!name) throw new ValidationError("Le nom est obligatoire")
  if (name.length > 200) throw new ValidationError("Nom trop long")

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })
  if (!user) throw new NotFoundError("Client")
  if (user.role !== "CLIENT") throw new ValidationError("Ce compte n'est pas un compte client")

  await prisma.user.update({ where: { id: user.id }, data: { name } })

  revalidatePath(`/admin/clients/${userId}`)
  revalidatePath("/admin/clients")
  revalidatePath("/dashboard")
}
