import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { CreativeCopywriter } from "@/lib/agents/acquisition/CreativeCopywriter"
import { deliverDraft } from "@/lib/acquisition/deliverDraft"

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

  // Relances AUTOMATIQUES : une relance est une séquence déjà engagée (le lead a
  // reçu le 1er mail) → on ne la laisse pas dormir dans la file de validation, on
  // la GÉNÈRE puis on l'ENVOIE directement. deliverDraft applique tous les
  // garde-fous (désinscrit, placeholder, email manquant) : une relance non
  // parfaite n'est jamais envoyée. Si l'envoi est bloqué, le brouillon reste en
  // attente de validation manuelle (statut PENDING_APPROVAL inchangé).
  const copywriter = new CreativeCopywriter()
  let generated = 0
  let sent = 0
  let blocked = 0
  for (const job of jobs) {
    try {
      const draftId = await copywriter.draftFollowUp(job.id, job.n)
      if (!draftId) continue
      generated++
      const draft = await prisma.emailDraft.findUnique({ where: { id: draftId }, include: { lead: true } })
      if (!draft) continue
      const r = await deliverDraft(draft)
      if (r.ok) sent++
      else blocked++
    } catch {
      /* un échec unitaire ne stoppe pas le lot */
    }
  }

  return NextResponse.json({ status: "ok", generated, sent, blocked, considered: jobs.length })
}
