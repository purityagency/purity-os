import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword, sanitizeEmailInput, sanitizePasswordInput } from "@/lib/auth"
import { issueEmailVerifyToken } from "@/lib/emailVerifyToken"
import { sendEmail } from "@/lib/email"
import { rateLimit } from "@/lib/rateLimit"
import { getBaseUrl } from "@/lib/utils"

export async function POST(request: Request) {
  // 5 inscriptions / 15 min / IP — l'endpoint envoie un email, on limite l'abus
  if (rateLimit(request, "register", 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))

  // Honeypot anti-bot — un vrai visiteur ne remplit jamais ce champ (masqué en CSS côté client)
  if (String(body.website || "").trim()) {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  const email = sanitizeEmailInput(body.email)
  const password = sanitizePasswordInput(body.password)
  const name = String(body.name || "").trim()

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: "name_required" }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 })
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  if (adminEmail && email === adminEmail) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    // Un compte existe déjà (vérifié, en attente de vérification, ou provisionné après commande) —
    // on ne réattribue jamais un email existant à une nouvelle inscription (ça rouvrirait le
    // squattage de compte). L'utilisateur doit se connecter ou redemander un lien.
    return NextResponse.json({ error: "email_taken" }, { status: 409 })
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role: "CLIENT",
      passwordHash: hashPassword(password),
    },
  })

  const rawToken = await issueEmailVerifyToken(user.id)
  const portalUrl = getBaseUrl()
  await sendEmail({
    to: user.email,
    subject: "Confirmez votre adresse e-mail — Purity Agency",
    html: `<p>Bonjour ${user.name ?? ""},</p><p>Confirmez votre adresse e-mail pour activer votre espace client Purity Agency :</p><p><a href="${portalUrl}/verify-email?token=${rawToken}">Confirmer mon e-mail</a></p><p>Ce lien expire dans 24h. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.</p>`,
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
