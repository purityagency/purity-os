"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"

export async function requireSession() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  return session
}

export async function requireAdminSession() {
  const session = await requireSession()

  if (session.user.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  return session
}
