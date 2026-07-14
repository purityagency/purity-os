import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { consumeMagicLinkRateLimit, createMagicLinkForUser, sendMagicLinkEmail } from "@/lib/magic-link"

function normalizeEmail(email: unknown) {
  return String(email ?? "").trim().toLowerCase()
}

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for") || ""
    const ip = forwardedFor.split(",")[0]?.trim() || "unknown"

    if (!consumeMagicLinkRateLimit(ip)) {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const body = await request.json().catch(() => ({}))
    const email = normalizeEmail(body.email)

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true },
    })

    if (!user || user.role !== "CLIENT") {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const magicLink = await createMagicLinkForUser(user.id)
    await sendMagicLinkEmail(user.email, magicLink)

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error("[client-login]", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
