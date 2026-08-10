import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { onLeadCaptured } from "@/lib/agents/acquisition/handlers/OnLeadCaptured"
import { LeadCapturedEvent } from "@/lib/agents/acquisition/events"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // enrichissement = appels LLM sérialisés (throttle Gemini)

// Draine les leads restés en NEW (capturés mais jamais enrichis). L'enrichissement
// tournait en tâche de fond DANS la fonction du scan, qui a une durée max : quand
// un scan capturait plusieurs leads, les derniers n'étaient jamais enrichis et
// restaient bloqués NEW (bug observé 2026-08-10). Ce cron rattrape la file, en
// petits lots pour tenir dans la durée de fonction. Chaque lead repasse par le
// pipeline standard (audit + contact + brouillon + score).
const MAX_PER_RUN = 4

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 500 })
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  // Uniquement les leads enrichissables : statut NEW + site web présent.
  const stuck = await prisma.lead.findMany({
    where: { status: "NEW", websiteUrl: { not: null } },
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    take: MAX_PER_RUN,
    select: { id: true },
  })

  if (stuck.length === 0) {
    return NextResponse.json({ status: "ok", enriched: 0, message: "Aucun lead NEW à enrichir." })
  }

  let enriched = 0
  for (const lead of stuck) {
    try {
      await onLeadCaptured(new LeadCapturedEvent(lead.id))
      enriched++
    } catch {
      /* un échec unitaire ne bloque pas le lot */
    }
  }

  const remaining = await prisma.lead.count({ where: { status: "NEW", websiteUrl: { not: null } } })
  return NextResponse.json({ status: "ok", enriched, remaining })
}
