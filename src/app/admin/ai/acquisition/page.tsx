import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { launchMission } from "@/actions/acquisitionActions"
import Link from "next/link"
import { MissionTracker } from "./MissionTracker"
import { PipelineKanban } from "./PipelineKanban"
import { BulkSendBar } from "./BulkSendBar"
import { cleanBelgianPhone } from "@/lib/acquisition/phone"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const maxDuration = 300

// Accent unique du pôle : lime signal (fini le violet générique). Utilisé
// UNIQUEMENT pour l'action primaire et l'état actif. Tout le reste : near-black
// chaud, os (bone), gris neutres. Un accent, verrouillé (taste-skill).
const ACCENT = "#c4f82a"

type AgentStatus = "active" | "idle" | "error"

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

  // Preuve réelle des 10 agents (aucun chiffre inventé) + statut réel.
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
    prisma.$queryRaw<Array<{ agentName: string; status: string; updatedAt: Date }>>`
      SELECT "agentName", status, "updatedAt" FROM "AgentActivity" WHERE department = '01_ACQUISITION'
    `,
  ])
  const proof = proofRows[0] ?? { missions: 0, audited: 0, scored: 0, drafted: 0, sent: 0, linkedin: 0, ads: 0, seo: 0 }
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
  const agents: { name: string; role: string; value: number; status: AgentStatus }[] = [
    { name: "Léa Dumont", role: "Prospection", value: totalLeads, status: statusOf(["Market Scout"]) },
    { name: "Karim Haddad", role: "Audit", value: proof.audited, status: statusOf(["Intelligence Analyst"]) },
    { name: "Yassine Bouzid", role: "Scoring", value: proof.scored, status: statusOf(["Lead Scoring Analyst"]) },
    { name: "Manon Verhoeven", role: "Rédaction", value: proof.drafted, status: statusOf(["Outreach Copywriter AI", "Creative Copywriter"]) },
    { name: "Thibault Nguyen", role: "Envoi", value: proof.sent, status: statusOf(["RevOps Automator"]) },
    { name: "Julien Servais", role: "Direction", value: proof.missions, status: statusOf(["Chief Acquisition AI"]) },
    { name: "Adam Peeters", role: "LinkedIn", value: proof.linkedin, status: statusOf(["LinkedIn Outreach Specialist"]) },
    { name: "Chloé Renard", role: "SEO", value: proof.seo, status: statusOf(["SEO Local Scout"]) },
    { name: "Sofia Marchetti", role: "Ads", value: proof.ads, status: statusOf(["Ads Strategist"]) },
    { name: "Emma Lambrecht", role: "Partenariats", value: 0, status: statusOf(["Referral Partnership Agent"]) },
  ]
  const agentsActive = agents.filter((a) => a.status === "active").length

  const contactedCount = statusCounts["CONTACTED"] ?? 0
  const repliedCount = statusCounts["REPLIED"] ?? 0
  const meetingCount = statusCounts["MEETING_BOOKED"] ?? 0
  const avgScore = avgScoreResult._avg.score ? Math.round(avgScoreResult._avg.score) : 0
  const replyDetectionActive = false

  // La SEULE action qui compte maintenant, calculée par priorité.
  const next =
    pendingDrafts.length > 0
      ? { value: pendingDrafts.length, label: "brouillons à valider", sub: "emails prêts à partir", href: "/admin/ai/acquisition/drafts", verb: "Valider maintenant" }
      : callableCount > 0
        ? { value: callableCount, label: "appels à passer", sub: "prospects joignables, script prêt", href: "/admin/ai/acquisition/calls", verb: "Commencer à appeler" }
        : repliedCount > 0
          ? { value: repliedCount, label: "réponses à traiter", sub: "des leads t'ont répondu", href: "/admin/ai/acquisition/inbox", verb: "Répondre" }
          : { value: totalLeads, label: "leads en base", sub: "lance une mission pour en trouver plus", href: "/admin/ai/acquisition/crm", verb: "Explorer les leads" }

  const funnel = [
    { k: "Sourcés", v: totalLeads, pct: 100 },
    { k: "Contactés", v: contactedCount, pct: totalLeads ? Math.round((contactedCount / totalLeads) * 100) : 0 },
    { k: "Répondu", v: replyDetectionActive ? repliedCount : null, pct: totalLeads ? Math.round((repliedCount / totalLeads) * 100) : 0 },
    { k: "RDV", v: meetingCount, pct: totalLeads ? Math.round((meetingCount / totalLeads) * 100) : 0 },
  ]

  const dot = (s: AgentStatus) => (s === "active" ? ACCENT : s === "error" ? "#ff5a5a" : "#4b4b46")

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0b] custom-scrollbar">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-8 py-6 space-y-6">

        {/* Ligne d'identité */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2.5">
            <span className="text-sm font-bold tracking-tight text-white">PURITY</span>
            <span className="text-sm font-light tracking-[0.2em] text-[#7a7a72]">ACQUISITION</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#7a7a72]">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
            {agentsActive}/10 agents actifs
          </div>
        </div>

        {/* HÉRO : prochaine action + entonnoir */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Prochaine action (dominant) */}
          <div className="lg:col-span-3 rounded-3xl border border-white/[0.06] bg-[#141416] p-7 flex flex-col justify-between min-h-[240px]">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#7a7a72]">Ta prochaine action</div>
              <div className="mt-5 flex items-end gap-4">
                <span className="text-7xl font-bold tabular-nums text-white leading-[0.85]">{next.value}</span>
                <span className="text-lg font-medium text-[#c9c9c2] mb-1.5">{next.label}</span>
              </div>
              <p className="mt-2 text-sm text-[#7a7a72]">{next.sub}</p>
            </div>
            <Link href={next.href} className="mt-6 inline-flex w-max items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-black transition hover:brightness-95" style={{ background: ACCENT }}>
              {next.verb}
              <span aria-hidden>→</span>
            </Link>
          </div>

          {/* Entonnoir + lancer un scan */}
          <div className="lg:col-span-2 rounded-3xl border border-white/[0.06] bg-[#141416] p-6 flex flex-col gap-5">
            <div className="space-y-3">
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#7a7a72]">Entonnoir</div>
              {funnel.map((f) => (
                <div key={f.k} className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-[#c9c9c2]">{f.k}</span>
                    <span className="text-sm font-mono tabular-nums text-white">{f.v === null ? "—" : f.v}<span className="text-[#5a5a54] ml-1">{f.v === null ? "" : `${f.pct}%`}</span></span>
                  </div>
                  <div className="h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(2, f.pct)}%`, background: f.k === "Sourcés" ? "#4b4b46" : ACCENT, opacity: f.k === "Sourcés" ? 1 : 0.55 + f.pct / 200 }} />
                  </div>
                </div>
              ))}
            </div>
            <details className="relative group mt-auto">
              <summary className="cursor-pointer list-none rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-white text-center hover:bg-white/5 transition">+ Lancer une mission de prospection</summary>
              <div className="absolute right-0 bottom-12 z-30 w-80 p-4 rounded-2xl border border-white/10 bg-[#1b1b1e] shadow-2xl space-y-2.5">
                <form action={launchMission} className="space-y-2.5">
                  {[
                    { id: "name", label: "Nom", type: "text", ph: "ex : Coiffeurs Namur", extra: {} },
                    { id: "sectors", label: "Secteur(s)", type: "text", ph: "ex : Coiffure & Beauté", extra: {} },
                    { id: "locations", label: "Ville(s)", type: "text", ph: "ex : Namur", extra: {} },
                  ].map((f) => (
                    <div key={f.id}>
                      <label className="block text-[10px] font-mono uppercase text-[#7a7a72] mb-1" htmlFor={`m-${f.id}`}>{f.label}</label>
                      <input id={`m-${f.id}`} name={f.id === "name" ? "name" : f.id} type={f.type} required placeholder={f.ph} className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-[#5a5a54] focus:outline-none focus:border-[#c4f82a]" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#7a7a72] mb-1" htmlFor="m-quota">Quota (1-50)</label>
                    <input id="m-quota" name="maxLeads" type="number" min={1} max={50} defaultValue={10} required className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#c4f82a]" />
                  </div>
                  <button type="submit" className="w-full py-2 rounded-lg text-xs font-bold text-black" style={{ background: ACCENT }}>Exécuter</button>
                </form>
              </div>
            </details>
          </div>
        </div>

        {/* Envoi groupé quand pertinent */}
        {pendingDrafts.length > 0 && <BulkSendBar scores={pendingDrafts.map((d) => d.lead.score ?? 0)} />}

        {/* L'équipe — 10 agents en ruban, preuve réelle */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#7a7a72]">L&apos;équipe · 10 agents IA</span>
            <span className="text-[11px] font-mono text-[#5a5a54]">score moyen {avgScore}/100 · {activeMissionsCount} mission(s) active(s)</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {agents.map((a) => {
              const initials = a.name.split(" ").map((p) => p[0]).join("").slice(0, 2)
              return (
                <div key={a.name} className="shrink-0 w-[150px] rounded-2xl border border-white/[0.06] bg-[#141416] p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-9 h-9 rounded-full bg-[#26261f] grid place-items-center text-[11px] font-bold text-[#c9c9c2]">
                      {initials}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#141416]" style={{ background: dot(a.status) }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{a.name}</div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#7a7a72]">{a.role}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-2xl font-bold font-mono tabular-nums text-white leading-none">{a.value}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pipeline + missions */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 rounded-2xl border border-white/[0.06] bg-[#141416] p-4 h-[440px] overflow-hidden">
            <PipelineKanban leads={allLeads} counts={statusCounts} total={totalLeads} replyDetectionActive={replyDetectionActive} />
          </div>
          <div className="h-[440px] flex flex-col rounded-2xl border border-white/[0.06] bg-[#141416] p-4 overflow-hidden">
            <h2 className="text-[10px] font-mono uppercase tracking-wider text-[#7a7a72] mb-3 shrink-0">Missions</h2>
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              <MissionTracker missions={missions as never} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
