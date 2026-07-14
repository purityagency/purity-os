import { randomBytes, scryptSync, timingSafeEqual } from "crypto"
import { prisma } from "@/lib/prisma"

const PASSWORD_PREFIX = "scrypt"

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `${PASSWORD_PREFIX}$${salt}$${hash}`
}

export function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false

  const [prefix, salt, expectedHash] = storedHash.split("$")
  if (prefix !== PASSWORD_PREFIX || !salt || !expectedHash) return false

  const actualHash = scryptSync(password, salt, 64)
  const expected = Buffer.from(expectedHash, "hex")

  if (actualHash.length !== expected.length) return false

  return timingSafeEqual(actualHash, expected)
}

export async function ensureBootstrapAdmin(email: string, password: string) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD?.trim()
  const adminName = process.env.ADMIN_NAME?.trim() || "Purity Admin"

  if (!adminEmail || !adminPassword) return null
  if (normalizeEmail(email) !== adminEmail || password !== adminPassword) return null

  const passwordHash = hashPassword(adminPassword)

  return prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      role: "ADMIN",
      passwordHash,
    },
    create: {
      email: adminEmail,
      name: adminName,
      role: "ADMIN",
      passwordHash,
    },
  })
}

export function sanitizePasswordInput(value: FormDataEntryValue | null) {
  return String(value ?? "").trim()
}

export function sanitizeEmailInput(value: FormDataEntryValue | null) {
  return normalizeEmail(String(value ?? ""))
}
