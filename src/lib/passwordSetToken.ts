import { randomBytes, createHash } from "crypto"
import { prisma } from "@/lib/prisma"

const TOKEN_TTL_MS = 48 * 60 * 60 * 1000 // 48h

function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex")
}

// Émet un lien à usage unique prouvant la propriété de l'email, utilisé pour
// définir (ou réinitialiser) le mot de passe. Écraser systématiquement le mot
// de passe existant à la validation neutralise tout compte pré-enregistré par
// un tiers avant que le vrai client ne paie/soit créé par l'admin.
export async function issuePasswordSetToken(userId: string) {
  const rawToken = randomBytes(32).toString("hex")
  await prisma.magicLinkToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  })
  return rawToken
}

export async function consumePasswordSetToken(rawToken: string) {
  const tokenHash = hashToken(rawToken)
  const record = await prisma.magicLinkToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!record) return null
  if (record.consumedAt) return null
  if (record.expiresAt.getTime() < Date.now()) return null

  await prisma.magicLinkToken.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  })

  return record.user
}
