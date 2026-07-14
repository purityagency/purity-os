import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "").trim()

    const secret = process.env.INTERNAL_API_SECRET
    if (!secret || token !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const email = String(body.email || "").trim().toLowerCase()
    const name = String(body.name || "").trim()
    const projectName = String(body.projectName || "Nouveau projet").trim()

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 })
    }

    // Upsert the client user
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        // If they already exist, we might update the name if missing
      },
      create: {
        email,
        name: name || null,
        role: "CLIENT",
      },
    })

    // Create the new project
    const project = await prisma.project.create({
      data: {
        clientId: user.id,
        name: projectName,
        status: "ACTIVE",
      },
    })

    return NextResponse.json({ ok: true, projectId: project.id, userId: user.id }, { status: 200 })
  } catch (error) {
    console.error("[internal-provision]", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
