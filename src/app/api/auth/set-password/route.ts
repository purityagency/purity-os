import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword, sanitizePasswordInput } from "@/lib/auth"
import { consumePasswordSetToken } from "@/lib/passwordSetToken"
import { rateLimit } from "@/lib/rateLimit"

export async function POST(request: Request) {
  const limited = rateLimit(request, "set-password", 10, 15 * 60 * 1000)
  if (limited) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const token = String(body.token || "").trim()
  const password = sanitizePasswordInput(body.password)

  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 })
  }

  const user = await consumePasswordSetToken(token)
  if (!user) {
    return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(password) },
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}
