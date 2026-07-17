import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { ensureBootstrapAdmin, sanitizeEmailInput, sanitizePasswordInput, verifyPassword } from "@/lib/auth"
import { rateLimitByHeaders } from "@/lib/rateLimit"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "client@purity.be" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials, req) {
        const email = sanitizeEmailInput(credentials?.email ?? null)
        const password = sanitizePasswordInput(credentials?.password ?? null)

        if (!email || !password) return null

        // 10 tentatives / 15 min / IP — protège le mot de passe admin (clé maîtresse permanente) du bruteforce
        if (rateLimitByHeaders(req?.headers, "login", 10, 15 * 60 * 1000)) {
          throw new Error("rate_limited")
        }

        const bootstrappedAdmin = await ensureBootstrapAdmin(email, password)
        if (bootstrappedAdmin) return bootstrappedAdmin

        const user = await prisma.user.findUnique({
          where: { email }
        })

        if (!user || !verifyPassword(password, user.passwordHash)) return null

        return user
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.role) {
        token.role = user.role
      }

      return token
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
        session.user.role = token.role === "ADMIN" ? "ADMIN" : "CLIENT"
      }
      return session
    }
  }
}
