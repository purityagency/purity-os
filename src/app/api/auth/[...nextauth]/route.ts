import NextAuth from "next-auth"
import { authOptions } from "@/modules/auth/authOptions"

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
