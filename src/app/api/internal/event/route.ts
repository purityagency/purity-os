import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalSecret } from "@/lib/internalAuth"

const VALID_TYPES = new Set(["LEAD", "BOOKING", "ORDER"])

export async function POST(request: Request) {
  try {
    if (!verifyInternalSecret(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const type = String(body.type || "").trim().toUpperCase()
    if (!VALID_TYPES.has(type)) {
      return NextResponse.json({ error: "invalid_type" }, { status: 400 })
    }

    const name = String(body.name || "").trim() || null
    const email = String(body.email || "").trim().toLowerCase() || null
    const phone = String(body.phone || "").trim() || null
    const company = String(body.company || "").trim() || null
    const summary = String(body.summary || "").trim().slice(0, 500) || null
    const payload = body.payload && typeof body.payload === "object" ? body.payload : undefined

    const event = await prisma.event.create({
      data: { type, name, email, phone, company, summary, payload },
    })

    return NextResponse.json({ ok: true, eventId: event.id }, { status: 200 })
  } catch (error) {
    console.error("[internal-event]", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
