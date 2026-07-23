import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: "ok", service: "purity-os", database: "ok", ts: Date.now() })
  } catch {
    return NextResponse.json({ status: "degraded", service: "purity-os", database: "unavailable", ts: Date.now() }, { status: 503 })
  }
}
