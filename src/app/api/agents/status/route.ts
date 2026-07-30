import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/session"
import { UnauthorizedError } from "@/lib/errors"

export const dynamic = "force-dynamic"

// Expose l'activité interne des agents (tâches en cours, logs) — réservé à
// l'admin, comme toute autre route de ce périmètre. Cette route vit hors de
// /admin/*, donc hors du garde de session posé par admin/layout.tsx : elle
// doit vérifier elle-même, sans quoi elle est publique.
export async function GET() {
  try {
    await requireAdminSession()
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
    throw error
  }

  try {
    const agents = await prisma.agentActivity.findMany({
      orderBy: {
        department: 'asc'
      }
    })
    return NextResponse.json({ agents })
  } catch (error) {
    console.error("Erreur lors de la récupération du statut des agents:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
