import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalSecret, readSignedBody } from "@/lib/internalAuth"

export async function POST(request: Request) {
  try {
    const { rawText, body } = await readSignedBody(request)
    if (!verifyInternalSecret(request, rawText)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const audit = body.audit || {}
    const source = String(body.source || "purity-agency-website")

    const event = await prisma.event.create({
      data: {
        type: "SYSTEM",
        summary: `Sentinel Audit (${source})`,
        payload: audit,
      },
    })

    return NextResponse.json({ ok: true, eventId: event.id }, { status: 200 })
  } catch (error) {
    console.error("[internal-sentinel-log]", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
