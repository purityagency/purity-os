import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword, sanitizeEmailInput, sanitizePasswordInput } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = sanitizeEmailInput(body.email)
    const password = sanitizePasswordInput(body.password)
    const name = String(body.name ?? "").trim()

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "password_too_short" }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ error: "name_required" }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "email_taken" }, { status: 400 })
    }

    const passwordHash = hashPassword(password)

    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "CLIENT",
      },
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error("[register]", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
