import type { DefaultSession } from "next-auth"

type AppRole = "ADMIN" | "CLIENT"

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string
      role: AppRole
    }
  }

  interface User {
    role: string
    passwordHash?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
  }
}
