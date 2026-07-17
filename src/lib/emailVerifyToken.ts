import { randomBytes, createHash } from "crypto"
import { prisma } from "@/lib/prisma"

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24h

function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex")
}

// Preuve de propriété de boîte mail pour l'auto-inscription. Tant que ce lien
// n'a pas été cliqué, le compte ne peut pas se connecter (voir authOptions.ts) —
// un compte auto-créé et jamais vérifié ne représente donc aucun risque de
// squattage : /api/internal/provision écrase de toute façon le mot de passe
// et revérifie l'email dès qu'une vraie commande arrive sur cette adresse.
export async function issueEmailVerifyToken(userId: string) {
  const rawToken = randomBytes(32).toString("hex")
  await prisma.magicLinkToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      purpose: "EMAIL_VERIFY",
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  })
  return rawToken
}

export async function consumeEmailVerifyToken(rawToken: string) {
  const tokenHash = hashToken(rawToken)
  const record = await prisma.magicLinkToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!record) return null
  if (record.purpose !== "EMAIL_VERIFY") return null
  if (record.consumedAt) return null
  if (record.expiresAt.getTime() < Date.now()) return null

  await prisma.magicLinkToken.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  })

  return record.user
}
