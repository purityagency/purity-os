import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sanitizeEmailInput } from "@/lib/auth"
import { issueEmailVerifyToken } from "@/lib/emailVerifyToken"
import { sendEmail } from "@/lib/email"
import { rateLimit } from "@/lib/rateLimit"
import { getBaseUrl } from "@/lib/utils"

export async function POST(request: Request) {
  if (rateLimit(request, "resend-verification", 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const email = sanitizeEmailInput(body.email)

  // Réponse générique dans tous les cas — ne jamais révéler si l'email existe ou est déjà vérifié
  const genericResponse = NextResponse.json({ ok: true }, { status: 200 })

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return genericResponse
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.role !== "CLIENT" || user.emailVerified || !user.passwordHash) {
    return genericResponse
  }

  const rawToken = await issueEmailVerifyToken(user.id)
  const portalUrl = getBaseUrl()
  await sendEmail({
    to: user.email,
    subject: "Confirmez votre adresse e-mail — Purity Agency",
    html: `<p>Bonjour ${user.name ?? ""},</p><p>Confirmez votre adresse e-mail pour activer votre espace client Purity Agency :</p><p><a href="${portalUrl}/verify-email?token=${rawToken}">Confirmer mon e-mail</a></p><p>Ce lien expire dans 24h.</p>`,
  })

  return genericResponse
}
