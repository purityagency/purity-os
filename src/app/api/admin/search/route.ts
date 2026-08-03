import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { UnauthorizedError } from "@/lib/errors"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    await requireAdminSession()
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
    throw error
  }

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") ?? "").trim().slice(0, 100)
  if (q.length < 2) return NextResponse.json({ clients: [], projects: [], leads: [] })

  const [clients, projects, leads] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "CLIENT",
        OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }],
      },
      select: { id: true, name: true, email: true },
      take: 5,
    }),
    prisma.project.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, client: { select: { name: true, email: true } } },
      take: 5,
    }),
    prisma.lead.findMany({
      where: { companyName: { contains: q, mode: "insensitive" } },
      select: { id: true, companyName: true, status: true },
      take: 5,
    }),
  ])

  return NextResponse.json({ clients, projects, leads })
}
