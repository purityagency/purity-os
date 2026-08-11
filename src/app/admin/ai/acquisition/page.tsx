import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { launchMission } from "@/actions/acquisitionActions"
import Link from "next/link"
import { MissionTracker } from "./MissionTracker"
import { PipelineKanban } from "./PipelineKanban"
import { BulkSendBar } from "./BulkSendBar"
import { AgentCommandGrid, AgentInfo, AgentStatus } from "./AgentCommandGrid"
import { cleanBelgianPhone } from "@/lib/acquisition/phone"
import { SpaceStarsBackground } from "@/components/acquisition/SpaceStarsBackground"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const maxDuration = 300

const ACCENT = "#c4f82a"

export default async function AdminAcquisitionPage() {
  await requireAdminSession()

  const missions = await prisma.mission.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { leads: true } } },
  })

  const pendingDraftsRaw = await prisma.emailDraft.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: { lead: true },
    orderBy: { createdAt: "desc" },
  })
  const pendingDrafts = pendingDraftsRaw.map((d) => ({
    ...d,
    lead: {
      ...d.lead,
      auditData: d.lead.auditData as { painPoints?: string[]; recommendedModules?: string[]; [key: string]: unknown } | null | undefined,
    },
  }))

  const allLeads = await prisma.lead.findMany({
    take: 200,
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  })

  const grouped = await prisma.lead.groupBy({ by: ["status"], _count: { _all: true } })
  const statusCounts: Record<string, number> = {}
  for (const g of grouped) statusCounts[g.status] = g._count._all

  const [totalLeads, avgScoreResult, activeMissionsCount, phoneRows] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.aggregate({ _avg: { score: true } }),
    prisma.mission.count({ where: { status: "ACTIVE" } }),
    prisma.lead.findMany({ where: { optedOut: false, status: { notIn: ["MEETING_BOOKED"] } }, select: { auditData: true } }),
  ])
  const callableCount = phoneRows.filter(
    (l) => cleanBelgianPhone((l.auditData as { contactPhone?: string } | null)?.contactPhone) !== null,
  ).length

  // Preuve réelle des 10 agents (100% dynamique depuis Postgres, 0 mock)
  const [proofRows, activityRows] = await Promise.all([
    prisma.$queryRaw<Array<{ missions: number; audited: number; scored: number; drafted: number; sent: number; linkedin: number; ads: number; seo: number; referral: number }>>`
      SELECT
        (SELECT COUNT(*) FROM "Mission")::int as missions,
        (SELECT COUNT(*) FROM "Lead" WHERE "auditData" IS NOT NULL AND (("auditData"->>'painPoints') IS NOT NULL OR ("auditData"->>'performanceScore') IS NOT NULL OR ("auditData"->>'contactPhone') IS NOT NULL))::int as audited,
        (SELECT COUNT(*) FROM "Lead" WHERE score IS NOT NULL)::int as scored,
        (SELECT COUNT(*) FROM "EmailDraft")::int as drafted,
        (SELECT COUNT(*) FROM "EmailDraft" WHERE status = 'SENT')::int as sent,
        (SELECT COUNT(*) FROM "Lead" WHERE ("auditData"->'linkedinDraft') IS NOT NULL)::int as linkedin,
        (SELECT COUNT(*) FROM "Lead" WHERE ("auditData"->'adsBrief') IS NOT NULL)::int as ads,
        (SELECT COUNT(*) FROM "Lead" WHERE ("auditData"->'seoAudit') IS NOT NULL)::int as seo,
        (SELECT COUNT(*) FROM "Lead" WHERE ("auditData"->'referralCandidates') IS NOT NULL)::int as referral
    `,
    prisma.$queryRaw<Array<{ agentName: string; status: string; currentTask: string | null; lastLog: string | null; updatedAt: Date }>>`
      SELECT "agentName", status, "currentTask", "lastLog", "updatedAt" FROM "AgentActivity" WHERE department = '01_ACQUISITION'
    `,
  ])
  const proof = proofRows[0] ?? { missions: 0, audited: 0, scored: 0, drafted: 0, sent: 0, linkedin: 0, ads: 0, seo: 0, referral: 0 }
  const activityMap = new Map(activityRows.map((r) => [r.agentName, r]))
  const DAY_MS = 24 * 60 * 60 * 1000

  const statusOf = (names: string[]): AgentStatus => {
    for (const n of names) {
      const a = activityMap.get(n)
      if (!a) continue
      return a.status === "ERROR" ? "error" : Date.now() - new Date(a.updatedAt).getTime() < DAY_MS ? "active" : "idle"
    }
    return "idle"
  }

  const logOf = (names: string[]): string | undefined => {
    for (const n of names) {
      const a = activityMap.get(n)
      if (a?.lastLog) return a.lastLog
    }
    return undefined
  }

  const agents: AgentInfo[] = [
    { id: "1", name: "Julien Servais", role: "Manager", persona: "Directeur de Mission", description: "Orchestre les 10 agents d'acquisition, planifie les missions et arbitre les priorités.", value: proof.missions, valueLabel: "Missions", status: statusOf(["Chief Acquisition AI"]), lastLog: logOf(["Chief Acquisition AI"]) },
    { id: "2", name: "Léa Dumont", role: "Sourcing", persona: "Market Scout", description: "Débusque les entreprises cibles via Exa API et Google Places sans jamais contacter personne.", value: totalLeads, valueLabel: "Leads sourcés", status: statusOf(["Market Scout"]), lastLog: logOf(["Market Scout"]) },
    { id: "3", name: "Karim Haddad", role: "Audit", persona: "Intelligence Analyst", description: "Analyse la maturité web (Lighthouse, GMB, UX) et extrait les contacts réels du site.", value: proof.audited, valueLabel: "Audits réalisés", status: statusOf(["Intelligence Analyst"]), lastLog: logOf(["Intelligence Analyst"]) },
    { id: "4", name: "Yassine Bouzid", role: "Scoring", persona: "Lead Scoring Analyst", description: "Calcule la valeur du prospect (0-100) sur des critères déterministes et vérifiables.", value: proof.scored, valueLabel: "Leads scorés", status: statusOf(["Lead Scoring Analyst"]), lastLog: logOf(["Lead Scoring Analyst"]) },
    { id: "5", name: "Manon Verhoeven", role: "Rédaction", persona: "Creative Copywriter", description: "Analyse l'audit technique et rédige une accroche B2B sur-mesure ancrée dans les faits réels.", value: proof.drafted, valueLabel: "Brouillons rédigés", status: statusOf(["Creative Copywriter"]), lastLog: logOf(["Creative Copywriter"]) },
    { id: "6", name: "Thibault Nguyen", role: "Délivrabilité", persona: "RevOps Automator", description: "Gère l'envoi via Resend, vérifie la blacklist RGPD et synchronise le CRM.", value: proof.sent, valueLabel: "Emails envoyés", status: statusOf(["RevOps Automator"]), lastLog: logOf(["RevOps Automator"]) },
    { id: "7", name: "Adam Peeters", role: "LinkedIn", persona: "LinkedIn Outreach", description: "Identifie les décideurs sur LinkedIn et prépare des approches basées sur des signaux réels.", value: proof.linkedin, valueLabel: "Contacts LinkedIn", status: statusOf(["LinkedIn Outreach Specialist"]), lastLog: logOf(["LinkedIn Outreach Specialist"]) },
    { id: "8", name: "Chloé Renard", role: "SEO Local", persona: "SEO Local Scout", description: "Compare la présence Google Business Profile du prospect face à son premier concurrent local.", value: proof.seo, valueLabel: "Audits SEO", status: statusOf(["SEO Local Scout"]), lastLog: logOf(["SEO Local Scout"]) },
    { id: "9", name: "Sofia Marchetti", role: "Ads Engine", persona: "Ads Strategist", description: "Calibre le budget publicitaire Meta/Google Ads et fixe les seuils d'arrêt de campagne.", value: proof.ads, valueLabel: "Briefs Ads", status: statusOf(["Ads Strategist"]), lastLog: logOf(["Ads Strategist"]) },
    { id: "10", name: "Emma Lambrecht", role: "Partenariats", persona: "Referral & Partner", description: "Cartographie les candidats au parrainage et les apporteurs d'affaires locaux non concurrents.", value: proof.referral, valueLabel: "Partenaires", status: statusOf(["Referral Partnership Agent"]), lastLog: logOf(["Referral Partnership Agent"]) },
  ]

  const agentsActive = agents.filter((a) => a.status === "active").length

  const contactedCount = statusCounts["CONTACTED"] ?? 0
  const repliedCount = statusCounts["REPLIED"] ?? 0
  const meetingCount = statusCounts["MEETING_BOOKED"] ?? 0
  const avgScore = avgScoreResult._avg.score ? Math.round(avgScoreResult._avg.score) : 0

  const next =
    pendingDrafts.length > 0
      ? { value: pendingDrafts.length, label: "brouillons à valider", sub: "emails rédigés et prêts à l'envoi", href: "/admin/ai/acquisition/drafts", verb: "Valider les brouillons" }
      : callableCount > 0
        ? { value: callableCount, label: "appels à passer", sub: "prospects qualifiés avec numéro direct", href: "/admin/ai/acquisition/calls", verb: "Ouvrir la liste d'appels" }
        : repliedCount > 0
          ? { value: repliedCount, label: "réponses reçues", sub: "prospects en attente de retour", href: "/admin/ai/acquisition/inbox", verb: "Traiter les réponses" }
          : { value: totalLeads, label: "prospects qualifiés en base", sub: "lancez une nouvelle mission pour continuer l'acquisition", href: "/admin/ai/acquisition/crm", verb: "Explorer le CRM" }

  const funnel = [
    { k: "Sourcés", v: totalLeads, pct: 100 },
    { k: "Contactés", v: contactedCount, pct: totalLeads ? Math.round((contactedCount / totalLeads) * 100) : 0 },
    { k: "Réponses", v: repliedCount, pct: totalLeads ? Math.round((repliedCount / totalLeads) * 100) : 0 },
    { k: "RDV Gagnés", v: meetingCount, pct: totalLeads ? Math.round((meetingCount / totalLeads) * 100) : 0 },
  ]

  return (
    <SpaceStarsBackground>
      <div className="h-full overflow-y-auto custom-scrollbar">
        <div className="max-w-[1480px] mx-auto px-4 lg:px-8 py-6 space-y-6">

        {/* Dynamic Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#c4f82a] font-bold">PURITY OS</span>
              <span className="text-xs font-mono text-zinc-500">/</span>
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-white font-bold">PÔLE 01 ACQUISITION</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">
              Centre de Commandement Prospection & Growth
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-[#c4f82a] animate-pulse" />
              <span>{agentsActive}/10 Agents IA Opérationnels</span>
            </div>
            <div className="text-zinc-500 hidden sm:block">
              Score moyen : <span className="text-white font-bold">{avgScore}/100</span>
            </div>
          </div>
        </div>

        {/* 10 Agents Command Grid */}
        <AgentCommandGrid agents={agents} />

        {/* HERO Action Sentinel + Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Main Action Sentinel */}
          <div className="lg:col-span-3 rounded-3xl border border-white/10 bg-[#121214]/70 backdrop-blur-xl p-7 flex flex-col justify-between min-h-[260px] relative overflow-hidden group shadow-2xl">
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#c4f82a]/5 blur-3xl group-hover:bg-[#c4f82a]/10 transition-all duration-700 pointer-events-none" />
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-400 font-bold">
                  ⚡ Action Prioritaire Détectée
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#c4f82a]/10 text-[#c4f82a] border border-[#c4f82a]/30 font-bold">
                  Priorité #1
                </span>
              </div>
              <div className="mt-6 flex items-baseline gap-4">
                <span className="text-7xl font-bold font-mono tabular-nums text-white leading-none tracking-tight">
                  {next.value}
                </span>
                <span className="text-xl font-medium text-zinc-200">{next.label}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-400 max-w-lg">{next.sub}</p>
            </div>
            
            <div className="mt-8 flex items-center gap-4">
              <Link
                href={next.href}
                className="inline-flex items-center gap-2.5 rounded-xl px-6 py-3 text-sm font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#c4f82a]/10 cursor-pointer"
                style={{ background: ACCENT }}
              >
                <span>{next.verb}</span>
                <span className="text-lg">→</span>
              </Link>
            </div>
          </div>

          {/* Live Funnel & Mission Launcher */}
          <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-[#121214]/70 backdrop-blur-xl p-6 flex flex-col justify-between gap-5 shadow-2xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-400 font-bold">
                  Funnel de Conversion
                </span>
                <span className="text-[10px] font-mono text-zinc-500">{totalLeads} prospects</span>
              </div>
              
              <div className="space-y-3">
                {funnel.map((f) => (
                  <div key={f.k} className="space-y-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-zinc-300 font-medium">{f.k}</span>
                      <span className="font-mono tabular-nums text-white font-bold">
                        {f.v} <span className="text-zinc-500 font-normal text-[11px]">({f.pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(3, f.pct)}%`,
                          background: f.k === "RDV Gagnés" ? "#c4f82a" : f.k === "Réponses" ? "#38bdf8" : "#a1a1aa",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Launch Mission Modal Trigger */}
            <details className="relative group">
              <summary className="cursor-pointer list-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-white text-center hover:bg-white/[0.06] hover:border-white/20 transition-all flex items-center justify-center gap-2">
                <span>+ Lancer une nouvelle mission de prospection</span>
              </summary>
              <div className="absolute right-0 bottom-14 z-30 w-80 p-5 rounded-2xl border border-white/15 bg-[#1b1b1e] shadow-2xl space-y-3">
                <div className="text-xs font-bold text-white border-b border-white/10 pb-2">
                  Nouvelle Mission IA
                </div>
                <form action={launchMission} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1" htmlFor="m-name">
                      Nom de la mission
                    </label>
                    <input
                      id="m-name"
                      name="name"
                      type="text"
                      required
                      placeholder="ex : Toitures Namur Q3"
                      className="w-full rounded-lg bg-black/50 border border-white/10 px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#c4f82a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1" htmlFor="m-sectors">
                      Secteur(s)
                    </label>
                    <input
                      id="m-sectors"
                      name="sectors"
                      type="text"
                      required
                      placeholder="ex : Artisan & Bâtiment"
                      className="w-full rounded-lg bg-black/50 border border-white/10 px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#c4f82a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1" htmlFor="m-locations">
                      Ville(s) / Zone(s)
                    </label>
                    <input
                      id="m-locations"
                      name="locations"
                      type="text"
                      required
                      placeholder="ex : Namur, Charleroi"
                      className="w-full rounded-lg bg-black/50 border border-white/10 px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#c4f82a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1" htmlFor="m-quota">
                      Quota de leads (1-50)
                    </label>
                    <input
                      id="m-quota"
                      name="maxLeads"
                      type="number"
                      min={1}
                      max={50}
                      defaultValue={15}
                      required
                      className="w-full rounded-lg bg-black/50 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c4f82a]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg text-xs font-bold text-black transition-all hover:brightness-105 cursor-pointer"
                    style={{ background: ACCENT }}
                  >
                    Exécuter la mission →
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>

        {/* Bulk Send Bar if Pending Drafts Exist */}
        {pendingDrafts.length > 0 && <BulkSendBar scores={pendingDrafts.map((d) => d.lead.score ?? 0)} />}

        {/* Pipeline Kanban & Mission Tracker */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-[#121214]/70 backdrop-blur-xl p-4 min-h-[460px] flex flex-col justify-between overflow-hidden shadow-2xl">
            <PipelineKanban leads={allLeads} counts={statusCounts} total={totalLeads} replyDetectionActive={false} />
          </div>
          <div className="min-h-[460px] flex flex-col rounded-2xl border border-white/10 bg-[#121214]/70 backdrop-blur-xl p-4 overflow-hidden shadow-2xl">
            <h2 className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold mb-3 shrink-0">
              Historique des Missions ({activeMissionsCount} actives)
            </h2>
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              <MissionTracker missions={missions as never} />
            </div>
          </div>
        </div>

        </div>
      </div>
    </SpaceStarsBackground>
  )
}
