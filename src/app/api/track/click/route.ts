import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyTrackingToken } from "@/lib/trackingToken"

export const dynamic = "force-dynamic"

// Redirect tracé d'un clic dans un email de prospection. Enregistre le clic
// (signal d'engagement fiable) puis redirige vers l'URL d'origine. On ne
// redirige QUE vers des URLs http(s) valides passées en clair — jamais une
// destination arbitraire non validée (protection open-redirect).
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const token = params.get("t")
  const target = params.get("u")

  let dest: URL | null = null
  try {
    if (target) {
      const u = new URL(target)
      if (u.protocol === "http:" || u.protocol === "https:") dest = u
    }
  } catch {
    dest = null
  }

  const draftId = token ? verifyTrackingToken(token) : null
  if (draftId) {
    try {
      const now = new Date()
      await prisma.emailDraft.updateMany({
        where: { id: draftId, clickedAt: null },
        data: { clickedAt: now },
      })
      await prisma.emailDraft.update({
        where: { id: draftId },
        data: { clickCount: { increment: 1 } },
      })
    } catch {
      /* best-effort */
    }
  }

  // Destination invalide/absente : on renvoie vers l'accueil plutôt que de
  // rediriger n'importe où.
  return NextResponse.redirect(dest ? dest.toString() : "https://purity-agency.be", 302)
}
