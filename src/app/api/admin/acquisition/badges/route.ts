import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"

export const dynamic = "force-dynamic"

// Compteurs légers pour les pastilles de notification de la nav Acquisition.
// Appelé au montage + en polling par le layout. Volontairement bon marché
// (count only, pas de scan JSON coûteux).
export async function GET() {
  await requireAdminSession()

  const [drafts, replies, callable] = await Promise.all([
    prisma.emailDraft.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.lead.count({ where: { status: "REPLIED" } }),
    // Approximation bon marché : leads non désinscrits, pas en RDV, avec un
    // numéro renseigné (validation fine du numéro faite côté page Appels).
    prisma.lead.count({
      where: {
        optedOut: false,
        status: { notIn: ["MEETING_BOOKED"] },
        auditData: { path: ["contactPhone"], not: null as never },
      },
    }),
  ])

  return NextResponse.json({ drafts, replies, callable })
}
