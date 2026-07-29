import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalSecret } from "@/lib/internalAuth"

const VALID_DEPARTMENTS = new Set([
  "00_CHIEF_AGENCY_AI",
  "01_ACQUISITION",
  "02_BRAND",
  "03_DELIVERY",
  "04_FINANCE",
  "05_STRATEGY",
  "COO",
  "ACQUISITION",
  "BRAND",
  "DELIVERY",
  "FINANCE",
  "STRATEGY",
])

export async function POST(request: Request) {
  try {
    if (!verifyInternalSecret(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const department = String(body.department || "00_CHIEF_AGENCY_AI").trim().toUpperCase()
    if (!VALID_DEPARTMENTS.has(department)) {
      return NextResponse.json({ error: "invalid_department" }, { status: 400 })
    }

    const task = String(body.task || "Mission IA sans titre").trim().slice(0, 500)
    const priority = String(body.priority || "NORMAL").trim()
    const data = body.data && typeof body.data === "object" ? body.data : {}

    const event = await prisma.event.create({
      data: {
        type: "AI",
        name: department,
        summary: `[IA - ${department}] ${task}`,
        payload: {
          department,
          task,
          priority,
          data,
          status: "DISPATCHED",
          dispatchedAt: new Date().toISOString(),
        },
      },
    })

    return NextResponse.json({ ok: true, eventId: event.id, department, task }, { status: 200 })
  } catch (error) {
    console.error("[internal-ai-dispatch]", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
