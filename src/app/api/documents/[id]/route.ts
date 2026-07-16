import { NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"
import { prisma } from "@/lib/prisma"
import { UPLOADS_DIR } from "@/lib/uploads"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const document = await prisma.document.findUnique({
    where: { id },
    include: { project: { select: { clientId: true } } },
  })
  if (!document) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const isAdmin = session.user.role === "ADMIN"
  const isOwner = document.project.clientId === session.user.id
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const filePath = path.join(UPLOADS_DIR, document.projectId, document.url)
  let buffer: Buffer
  try {
    buffer = await fs.readFile(filePath)
  } catch {
    return NextResponse.json({ error: "file_missing" }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(document.filename)}"`,
      "Cache-Control": "private, no-store",
    },
  })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const document = await prisma.document.findUnique({ where: { id } })
  if (!document) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const filePath = path.join(UPLOADS_DIR, document.projectId, document.url)
  await fs.rm(filePath, { force: true })
  await prisma.document.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
