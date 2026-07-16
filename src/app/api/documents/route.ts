import { NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"
import { prisma } from "@/lib/prisma"
import { ensureUploadsDir, safeStoredFilename } from "@/lib/uploads"

const ALLOWED_TYPES = ["INVOICE", "ASSET", "CONTRACT"] as const
const MAX_SIZE = 20 * 1024 * 1024 // 20 Mo

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const projectId = String(formData.get("projectId") ?? "").trim()
  const type = String(formData.get("type") ?? "").trim()
  const file = formData.get("file")

  if (!projectId || !ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 })
  }

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
  if (!project) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 })
  }

  const dir = await ensureUploadsDir(projectId)
  const storedFilename = safeStoredFilename(file.name)
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(path.join(dir, storedFilename), buffer)

  const document = await prisma.document.create({
    data: {
      projectId,
      type,
      url: storedFilename,
      filename: file.name.slice(0, 200),
      filesize: file.size,
      mimeType: file.type || "application/octet-stream",
      uploadedBy: session.user.id,
    },
  })

  return NextResponse.json({ ok: true, document }, { status: 201 })
}
