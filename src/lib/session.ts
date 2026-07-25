"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"
import { UnauthorizedError } from "@/lib/errors"

export async function requireSession() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new UnauthorizedError("Session expirée, reconnectez-vous")
  }

  return session
}

export async function requireAdminSession() {
  const session = await requireSession()

  if (session.user.role !== "ADMIN") {
    throw new UnauthorizedError("Réservé aux administrateurs")
  }

  return session
}
