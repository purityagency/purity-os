import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { consumeEmailVerifyToken } from "@/lib/emailVerifyToken"
import { rateLimit } from "@/lib/rateLimit"

export async function POST(request: Request) {
  if (rateLimit(request, "verify-email", 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const token = String(body.token || "").trim()

  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 })
  }

  const user = await consumeEmailVerifyToken(token)
  if (!user) {
    return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 400 })
  }

  if (!user.emailVerified) {
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
