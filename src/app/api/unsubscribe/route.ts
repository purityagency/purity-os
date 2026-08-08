import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyUnsubscribeToken } from "@/lib/unsubscribeToken"
import { logger } from "@/core/logger"

export const dynamic = "force-dynamic"

// Route publique de désinscription — le token signé fait office
// d'authentification (aucune session requise). Marque le lead comme optedOut
// de façon définitive et transversale : plus aucun email ne pourra lui être
// envoyé (voir approveAndSendDraft qui refuse un lead optedOut).

async function optOut(token: string | null): Promise<boolean> {
  if (!token) return false
  const leadId = verifyUnsubscribeToken(token)
  if (!leadId) return false

  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: { optedOut: true, optedOutAt: new Date() },
    })
    logger.info(`[unsubscribe] Lead ${leadId} désinscrit`)
    return true
  } catch (err) {
    logger.error(`[unsubscribe] Échec désinscription lead ${leadId}`, err)
    return false
  }
}

function confirmationPage(ok: boolean): NextResponse {
  const body = ok
    ? `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Désinscription confirmée</title></head><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#0a0a0a;color:#f5f5f5;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px"><div style="max-width:480px;text-align:center"><h1 style="font-size:20px;font-weight:600;margin:0 0 12px">Vous êtes désinscrit.</h1><p style="color:#a3a3a3;line-height:1.6;margin:0">Vous ne recevrez plus aucun email de prospection de la part de Purity Agency. C'est définitif — aucune action supplémentaire n'est nécessaire.</p></div></body></html>`
    : `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Lien invalide</title></head><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#0a0a0a;color:#f5f5f5;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px"><div style="max-width:480px;text-align:center"><h1 style="font-size:20px;font-weight:600;margin:0 0 12px">Lien invalide ou expiré.</h1><p style="color:#a3a3a3;line-height:1.6;margin:0">Ce lien de désinscription n'est pas valide. Écrivez à <a href="mailto:contact@purity-agency.be" style="color:#f5f5f5">contact@purity-agency.be</a> et nous vous retirerons manuellement.</p></div></body></html>`
  return new NextResponse(body, { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } })
}

// Clic depuis l'email (navigateur).
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")
  return confirmationPage(await optOut(token))
}

// One-click RFC 8058 — le client mail (Gmail/Yahoo) envoie un POST automatique
// via le header List-Unsubscribe-Post, sans ouvrir de page.
export async function POST(request: Request) {
  const url = new URL(request.url)
  let token = url.searchParams.get("token")
  if (!token) {
    const body = await request.text().catch(() => "")
    token = new URLSearchParams(body).get("token")
  }
  const ok = await optOut(token)
  return NextResponse.json({ status: ok ? "unsubscribed" : "invalid" }, { status: ok ? 200 : 400 })
}
