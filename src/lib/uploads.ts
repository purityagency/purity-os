import path from "node:path"
import fs from "node:fs/promises"

// Stocké hors de /public — jamais servi statiquement, uniquement via la route API authentifiée.
export const UPLOADS_DIR = path.join(process.cwd(), "uploads")

export async function ensureUploadsDir(projectId: string) {
  const dir = path.join(UPLOADS_DIR, projectId)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export function safeStoredFilename(originalName: string) {
  const ext = path.extname(originalName).slice(0, 20)
  const base = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8)
  return base + ext
}
