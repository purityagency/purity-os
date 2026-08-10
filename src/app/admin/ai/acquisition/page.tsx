import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { launchMission } from "@/actions/acquisitionActions"
import Link from "next/link"
import { MissionTracker } from "./MissionTracker"
import { PipelineKanban } from "./PipelineKanban"
import { BulkSendBar } from "./BulkSendBar"
import { AgentTeamPanel } from "./AgentTeamPanel"
import { cleanBelgianPhone } from "@/lib/acquisition/phone"

export const dynamic = "force-dynamic"
export const revalidate = 0
// Le lancement manuel d'une mission exécute le Market Scout en tâche de fond
// (after()) : la fonction doit rester vivante assez longtemps pour scouter.
export const maxDuration = 300

// Entonnoir proportionnel réel : chaque étape = une barre dont la largeur
// reflète le volume vs total. Honnête sur la détection de réponses (auto off).
function Funnel({ total, contacted, replied, meetings, replyDetectionActive }: {
  total: number; contacted: number; replied: number; meetings: number; replyDetectionActive: boolean
}) {
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
  const w = (n: number) => `${total > 0 ? Math.max(2, Math.min(100, (n / total) * 100)) : 0}%`
  const stages = [
    { label: "Sourcés", value: String(total), sub: "100%", width: "100%", bar: "bg-zinc-400" },
    { label: "Contactés", value: String(contacted), sub: `${pct(contacted)}%`, width: w(contacted), bar: "bg-violet-500" },
    { label: "Répondu", value: replyDetectionActive ? String(replied) : "—", sub: replyDetectionActive ? `${pct(replied)}%` : "auto off", width: w(replied), bar: "bg-cyan-500" },
    { label: "RDV", value: String(meetings), sub: `${pct(meetings)}%`, width: w(meetings), bar: meetings > 0 ? "bg-emerald-500" : "bg-white/10" },
  ]
  return (
    <div className="grid grid-cols-4 gap-4">
      {stages.map((s) => (
        <div key={s.label}>
          <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">{s.label}</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-2xl font-bold font-mono tabular-nums text-white leading-none">{s.value}</span>
            <span className="text-[10px] font-mono text-zinc-500">{s.sub}</span>
          </div>
          <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div className={`h-full ${s.bar} transition-all`} style={{ width: s.width }} />
          </div>
        </div>
      ))}
    </div>
  )
}

const ACTION_TONE: Record<string, { border: string; val: string }> = {
  amber: { border: "border-amber-500/25 hover:border-amber-500/50", val: "text-amber-400" },
  emerald: { border: "border-emerald-500/25 hover:border-emerald-500/50", val: "text-emerald-400" },
  violet: { border: "border-violet-500/25 hover:border-violet-500/50", val: "text-violet-400" },
}

function ActionCard({ href, label, value, sub, cta, tone }: {
  href: string; label: string; value: number; sub: string; cta: string; tone: keyof typeof ACTION_TONE
}) {
  const empty = value === 0
  const t = ACTION_TONE[tone]
  return (
    <Link href={href} className={`group flex items-center justify-between gap-3 rounded-xl border bg-white/[0.02] hover:bg-white/[0.04] p-4 transition-colors ${empty ? "border-white/[0.08]" : t.border}`}>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-zinc-300 truncate">{label}</div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className={`text-3xl font-bold font-mono tabular-nums leading-none ${empty ? "text-zinc-600" : t.val}`}>{value}</span>
          <span className="text-[10px] text-zinc-500 truncate">{sub}</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-zinc-500 group-hover:text-white transition-colors whitespace-nowrap shrink-0">{empty ? "à jour" : cta}</span>
    </Link>
  )
}

export default async function AdminAcquisitionPage() {
  await requireAdminSession()

  // Fetch ALL missions with lead count + parameters
  const missions = await prisma.mission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { leads: true } }
    }
  })

  // Fetch pending drafts
  const pendingDraftsRaw = await prisma.emailDraft.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: { lead: true },
    orderBy: { createdAt: "desc" }
  })

  // Cast JSON field to satisfy TypeScript
  const pendingDrafts = pendingDraftsRaw.map((d) => ({
    ...d,
    lead: {
      ...d.lead,
      auditData: d.lead.auditData as { painPoints?: string[]; recommendedModules?: string[]; [key: string]: unknown } | null | undefined,
    },
  }))

  // Leads for Pipeline Kanban (all statuses, capped at 200)
  const allLeads = await prisma.lead.findMany({
    take: 200,
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  })

  // Comptes RÉELS par statut (source unique de vérité) — jamais dérivés du
  // tableau plafonné à 200, sinon les chiffres se contredisent entre le Kanban
  // et les KPI (finding audit UI 2026-08-09).
  const grouped = await prisma.lead.groupBy({ by: ["status"], _count: { _all: true } })
  const statusCounts: Record<string, number> = {}
  for (const g of grouped) statusCounts[g.status] = g._count._all

  const [totalLeads, avgScoreResult, activeMissionsCount, phoneRows] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.aggregate({ _avg: { score: true } }),
    prisma.mission.count({ where: { status: "ACTIVE" } }),
    // Leads joignables par téléphone (numéro valide, non désinscrits, pas déjà en RDV).
    prisma.lead.findMany({
      where: { optedOut: false, status: { notIn: ["MEETING_BOOKED"] } },
      select: { auditData: true },
    }),
  ])

  const callableCount = phoneRows.filter(
    (l) => cleanBelgianPhone((l.auditData as { contactPhone?: string } | null)?.contactPhone) !== null,
  ).length

  // Preuve réelle du travail des 10 agents (aucun chiffre inventé) + statut réel.
  const [proofRows, activityRows] = await Promise.all([
    prisma.$queryRaw<Array<{ missions: number; audited: number; scored: number; drafted: number; sent: number; linkedin: number; ads: number; seo: number }>>`
      SELECT
        (SELECT COUNT(*) FROM "Mission")::int as missions,
        (SELECT COUNT(*) FROM "Lead" WHERE "auditData" IS NOT NULL AND (("auditData"->>'painPoints') IS NOT NULL OR ("auditData"->>'performanceScore') IS NOT NULL OR ("auditData"->>'contactPhone') IS NOT NULL))::int as audited,
        (SELECT COUNT(*) FROM "Lead" WHERE score IS NOT NULL)::int as scored,
        (SELECT COUNT(*) FROM "EmailDraft")::int as drafted,
        (SELECT COUNT(*) FROM "EmailDraft" WHERE status = 'SENT')::int as sent,
        (SELECT COUNT(*) FROM "Lead" WHERE ("auditData"->'linkedinDraft') IS NOT NULL)::int as linkedin,
        (SELECT COUNT(*) FROM "Lead" WHERE ("auditData"->'adsBrief') IS NOT NULL)::int as ads,
        (SELECT COUNT(*) FROM "Lead" WHERE ("auditData"->'seoAudit') IS NOT NULL)::int as seo
    `,
    prisma.$queryRaw<Array<{ agentName: string; status: string; lastLog: string | null; updatedAt: Date }>>`
      SELECT "agentName", status, "lastLog", "updatedAt" FROM "AgentActivity" WHERE department = '01_ACQUISITION'
    `,
  ])
  const proof = proofRows[0] ?? { missions: 0, audited: 0, scored: 0, drafted: 0, sent: 0, linkedin: 0, ads: 0, seo: 0 }
  const activityMap = new Map(activityRows.map((r) => [r.agentName, r]))
  const DAY_MS = 24 * 60 * 60 * 1000
  function agentState(names: string[]): { status: "active" | "idle" | "error"; lastLog: string | null } {
    for (const n of names) {
      const a = activityMap.get(n)
      if (!a) continue
      const status = a.status === "ERROR" ? "error" : Date.now() - new Date(a.updatedAt).getTime() < DAY_MS ? "active" : "idle"
      const lastLog = a.lastLog ? a.lastLog.replace(/^\[[^\]]+\]\s*/, "") : null
      return { status, lastLog }
    }
    return { status: "idle", lastLog: null }
  }
  const agents = [
    { name: "Julien Servais", role: "Chef d'acquisition", proofValue: proof.missions, proofLabel: "missions pilotées", ...agentState(["Chief Acquisition AI"]) },
    { name: "Léa Dumont", role: "Prospection web", proofValue: totalLeads, proofLabel: "leads sourcés", ...agentState(["Market Scout"]) },
    { name: "Karim Haddad", role: "Audit technique", proofValue: proof.audited, proofLabel: "sites audités", ...agentState(["Intelligence Analyst"]) },
    { name: "Yassine Bouzid", role: "Scoring leads", proofValue: proof.scored, proofLabel: "leads scorés", ...agentState(["Lead Scoring Analyst"]) },
    { name: "Manon Verhoeven", role: "Rédaction emails", proofValue: proof.drafted, proofLabel: "emails rédigés", ...agentState(["Outreach Copywriter AI", "Creative Copywriter"]) },
    { name: "Thibault Nguyen", role: "Envoi / RevOps", proofValue: proof.sent, proofLabel: "emails envoyés", ...agentState(["RevOps Automator"]) },
    { name: "Adam Peeters", role: "Outreach LinkedIn", proofValue: proof.linkedin, proofLabel: "messages générés", ...agentState(["LinkedIn Outreach Specialist"]) },
    { name: "Chloé Renard", role: "SEO local", proofValue: proof.seo, proofLabel: "audits SEO", ...agentState(["SEO Local Scout"]) },
    { name: "Sofia Marchetti", role: "Stratégie pub", proofValue: proof.ads, proofLabel: "briefs Ads", ...agentState(["Ads Strategist"]) },
    { name: "Emma Lambrecht", role: "Partenariats", proofValue: 0, proofLabel: "partenariats", ...agentState(["Referral Partnership Agent"]) },
  ]

  const contactedCount = statusCounts["CONTACTED"] ?? 0
  const repliedCount = statusCounts["REPLIED"] ?? 0
  const meetingCount = statusCounts["MEETING_BOOKED"] ?? 0
  const avgScore = avgScoreResult._avg.score ? Math.round(avgScoreResult._avg.score) : 0

  // Détection auto des réponses inactive tant que le Worker Cloudflare n'est pas
  // déployé : afficher "0 répondu" serait un mensonge (des réponses existent
  // peut-être dans Gmail). On le signale honnêtement dans l'UI.
  const replyDetectionActive = false

  return (
    <div className="h-full overflow-y-auto p-4 lg:p-8 space-y-5 custom-scrollbar">
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Cockpit acquisition</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Ton pipeline de prospection en un coup d&apos;œil, et quoi faire maintenant.</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Launch Mission Modal Trigger */}
            <details className="relative group">
              <summary className="cursor-pointer list-none px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors">
                + Lancer un scan
              </summary>
              <div className="absolute right-0 top-10 z-30 w-80 p-4 rounded-xl border border-white/10 bg-[#120c1c] shadow-2xl space-y-3">
                <p className="font-bold text-xs text-white">Lancer une nouvelle mission de prospection</p>
                <form action={launchMission} className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1" htmlFor="mission-name">Nom Mission</label>
                    <input id="mission-name" name="name" type="text" required placeholder="ex: Hôtels Namur" className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1" htmlFor="mission-quota">Quota (1-50)</label>
                    <input id="mission-quota" name="maxLeads" type="number" min={1} max={50} defaultValue={10} required className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1" htmlFor="mission-sectors">Secteur(s)</label>
                    <input id="mission-sectors" name="sectors" type="text" required placeholder="ex: HoReCa" className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1" htmlFor="mission-locations">Ville(s)</label>
                    <input id="mission-locations" name="locations" type="text" required placeholder="ex: Namur" className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500" />
                  </div>
                  <button type="submit" className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white transition-all cursor-pointer">
                    Exécuter le Scan
                  </button>
                </form>
              </div>
            </details>

            <a
              href="/api/admin/export/leads"
              download
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors shrink-0"
            >
              ↓ Exporter CSV
            </a>
          </div>
        </div>

        {/* Entonnoir réel + méta compacte */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Entonnoir</span>
            <Link href="/admin/ai/acquisition/crm" className="text-[10px] font-mono text-zinc-500 hover:text-violet-300 transition-colors">
              {totalLeads} leads · score moyen {avgScore}/100 · {activeMissionsCount} mission(s) active(s) →
            </Link>
          </div>
          <Funnel total={totalLeads} contacted={contactedCount} replied={repliedCount} meetings={meetingCount} replyDetectionActive={replyDetectionActive} />
        </div>

        {/* À faire maintenant — le cœur pratique du cockpit */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">À faire maintenant</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ActionCard href="/admin/ai/acquisition/drafts" label="Brouillons à valider" value={pendingDrafts.length} sub="prêts à envoyer" cta="Valider →" tone="amber" />
            <ActionCard href="/admin/ai/acquisition/calls" label="Appels prioritaires" value={callableCount} sub="joignables par tél." cta="Appeler →" tone="emerald" />
            <ActionCard href="/admin/ai/acquisition/inbox" label="Réponses à traiter" value={repliedCount} sub="leads ont répondu" cta="Répondre →" tone="violet" />
          </div>
        </div>

        {/* Envoi groupé quand il y a des brouillons */}
        {pendingDrafts.length > 0 && (
          <BulkSendBar scores={pendingDrafts.map((d) => d.lead.score ?? 0)} />
        )}
      </div>

      {/* Équipe IA — preuve réelle des 10 agents du pôle */}
      <AgentTeamPanel agents={agents} />

      {/* Pipeline + Missions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 h-[440px] overflow-hidden">
          <PipelineKanban
            leads={allLeads}
            counts={statusCounts}
            total={totalLeads}
            replyDetectionActive={replyDetectionActive}
          />
        </div>

        <div className="h-[440px] flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.01] p-4 overflow-hidden">
          <h2 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-3 shrink-0">Missions</h2>
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            <MissionTracker missions={missions as never} />
          </div>
        </div>
      </div>
    </div>
  )
}
