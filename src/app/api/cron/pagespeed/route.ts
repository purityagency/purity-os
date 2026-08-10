import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { LeadScoringAnalyst } from "@/lib/agents/acquisition/LeadScoringAnalyst"
import { isPageSpeedFresh } from "@/lib/acquisition/pageSpeedInsights"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // chaque test PSI peut prendre jusqu'à ~55 s

// Rafraîchit / backfill les tests Google PageSpeed Insights des HOT leads
// (score > 60) avec un site. Le pipeline teste déjà chaque nouveau hot lead à la
// capture ; ce cron couvre les leads EXISTANTS (avant cette feature) et
// re-teste ceux dont le rapport a vieilli. Plafonné par exécution pour rester
// dans la durée max de la fonction.
const HOT_LEAD_THRESHOLD = 60
const MAX_PER_RUN = 4

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 500 })
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  // Candidats : hot leads avec un site. Le filtre de fraîcheur se fait en JS
  // (auditData est du JSON, difficile à interroger précisément côté SQL).
  const candidates = await prisma.lead.findMany({
    where: { score: { gt: HOT_LEAD_THRESHOLD }, websiteUrl: { not: null } },
    orderBy: { score: "desc" },
    select: { id: true, websiteUrl: true, companyName: true, auditData: true },
  })

  const stale = candidates.filter((l) => {
    const audit = (l.auditData as Record<string, unknown> | null) ?? {}
    return !isPageSpeedFresh(audit.pageSpeed)
  })

  const batch = stale.slice(0, MAX_PER_RUN)
  if (batch.length === 0) {
    return NextResponse.json({ status: "ok", tested: 0, message: "Tous les hot leads ont un rapport PageSpeed frais." })
  }

  const scorer = new LeadScoringAnalyst()
  let tested = 0
  for (const lead of batch) {
    try {
      await scorer.runPageSpeedForHotLead(lead.id, lead.websiteUrl!, lead.companyName)
      tested++
    } catch {
      /* un échec unitaire ne stoppe pas le lot */
    }
  }

  return NextResponse.json({ status: "ok", tested, remaining: stale.length - tested })
}
