import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { CreativeCopywriter } from "@/lib/agents/acquisition/CreativeCopywriter"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // relances = appels LLM séquentiels espacés (throttle Gemini)

// Cadence de relance (recherche cold email 2026) : relance 1 à J+3, relance 2 à
// J+7 après la précédente. Max 2. Chaque relance est générée comme brouillon à
// VALIDER (elle réutilise la file + les garde-fous + l'envoi humain), jamais
// envoyée automatiquement.
const RELANCE_1_AFTER_DAYS = 3
const RELANCE_2_AFTER_DAYS = 7
const MAX_PER_RUN = 12 // plafond par exécution : durée fonction + quota Gemini

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 500 })
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const now = Date.now()
  const cutoff1 = new Date(now - RELANCE_1_AFTER_DAYS * 86_400_000)
  const cutoff2 = new Date(now - RELANCE_2_AFTER_DAYS * 86_400_000)

  // Éligibles : contactés, non désinscrits, joignables, sans brouillon déjà en
  // attente (on n'empile pas), et dont le dernier contact dépasse le délai
  // correspondant à leur prochaine relance.
  const base = {
    status: "CONTACTED" as const,
    optedOut: false,
    contactEmail: { not: null },
    emailDrafts: { none: { status: "PENDING_APPROVAL" as const } },
  }

  const [relance1, relance2] = await Promise.all([
    prisma.lead.findMany({
      where: { ...base, relanceCount: 0, lastContactedAt: { lte: cutoff1 } },
      select: { id: true },
      take: MAX_PER_RUN,
    }),
    prisma.lead.findMany({
      where: { ...base, relanceCount: 1, lastContactedAt: { lte: cutoff2 } },
      select: { id: true },
      take: MAX_PER_RUN,
    }),
  ])

  const jobs = [
    ...relance2.map((l) => ({ id: l.id, n: 2 as const })), // les 2e relances d'abord (leads plus avancés)
    ...relance1.map((l) => ({ id: l.id, n: 1 as const })),
  ].slice(0, MAX_PER_RUN)

  if (jobs.length === 0) {
    return NextResponse.json({ status: "ok", generated: 0, message: "Aucune relance à générer." })
  }

  const copywriter = new CreativeCopywriter()
  let generated = 0
  for (const job of jobs) {
    try {
      await copywriter.draftFollowUp(job.id, job.n)
      generated++
    } catch {
      /* un échec unitaire ne stoppe pas le lot */
    }
  }

  return NextResponse.json({ status: "ok", generated, considered: jobs.length })
}
