import { prisma } from "@/lib/prisma"
import { verifyTrackingToken } from "@/lib/trackingToken"

export const dynamic = "force-dynamic"

// GIF transparent 1x1 — le pixel d'ouverture. On répond TOUJOURS l'image (même
// token invalide) pour ne rien révéler et ne jamais casser le rendu du mail.
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
)

function pixelResponse() {
  return new Response(new Uint8Array(PIXEL), {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      // Jamais mis en cache : chaque ouverture doit rappeler le serveur.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
    },
  })
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t")
  const draftId = token ? verifyTrackingToken(token) : null

  if (draftId) {
    try {
      const now = new Date()
      // openedAt seulement si null (1re ouverture) — via updateMany conditionnel
      // pour rester atomique sans lire d'abord.
      await prisma.emailDraft.updateMany({
        where: { id: draftId, openedAt: null },
        data: { openedAt: now },
      })
      await prisma.emailDraft.update({
        where: { id: draftId },
        data: { openCount: { increment: 1 }, lastOpenedAt: now },
      })
    } catch {
      /* tracking best-effort : ne jamais échouer le pixel */
    }
  }

  return pixelResponse()
}
