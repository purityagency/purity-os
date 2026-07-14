import { createHash, randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"

const MAGIC_LINK_TTL_MINUTES = 20
const rateMap = new Map<string, { count: number; resetAt: number }>()

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

function portalBaseUrl() {
  const configured = (process.env.NEXTAUTH_URL || process.env.PORTAL_BASE_URL || "").trim()
  if (configured) return configured
  if (process.env.NODE_ENV !== "production") return "http://localhost:3001"
  return ""
}

export function consumeMagicLinkRateLimit(key: string) {
  const now = Date.now()
  const existing = rateMap.get(key)

  if (!existing || now > existing.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + 10 * 60_000 })
    return true
  }

  if (existing.count >= 5) return false
  existing.count += 1
  return true
}

export async function createMagicLinkForUser(userId: string) {
  const rawToken = randomBytes(32).toString("hex")
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60_000)

  await prisma.magicLinkToken.deleteMany({
    where: {
      userId,
      OR: [{ consumedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
    },
  })

  await prisma.magicLinkToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  })

  const baseUrl = portalBaseUrl()
  if (!baseUrl) throw new Error("NEXTAUTH_URL is not configured")

  return `${baseUrl}/magic-login?token=${rawToken}`
}

export async function consumeMagicLinkToken(rawToken: string) {
  const tokenHash = hashToken(rawToken)
  const now = new Date()

  const token = await prisma.magicLinkToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!token) return null
  if (token.consumedAt || token.expiresAt <= now) return null
  if (token.user.role !== "CLIENT") return null

  await prisma.magicLinkToken.update({
    where: { id: token.id },
    data: { consumedAt: now },
  })

  return token.user
}

export async function sendMagicLinkEmail(email: string, magicLink: string) {
  const resendApiKey = process.env.RESEND_API_KEY?.trim()
  const from = (process.env.CONTACT_FROM || "Purity Agency <onboarding@resend.dev>").trim()

  if (!resendApiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[magic-link] ${email} -> ${magicLink}`)
      return
    }
    throw new Error("RESEND_API_KEY is not configured")
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Votre accès à l'espace client Purity",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
          <h2 style="margin-bottom:12px">Accédez à votre espace client</h2>
          <p>Voici votre lien sécurisé pour entrer dans votre portail Purity.</p>
          <p style="margin:24px 0">
            <a href="${magicLink}" style="background:#7C3AED;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block;font-weight:600">Accéder à mon espace</a>
          </p>
          <p>Ce lien expire dans ${MAGIC_LINK_TTL_MINUTES} minutes.</p>
        </div>
      `,
    }),
    cache: "no-store",
  })

  if (!response.ok) throw new Error(`resend_failed_${response.status}`)
}
