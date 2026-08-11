import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { launchMission } from "@/actions/acquisitionActions"
import Link from "next/link"
import { AgentCommandGrid, AgentInfo, AgentStatus } from "./AgentCommandGrid"
import { cleanBelgianPhone } from "@/lib/acquisition/phone"
import { LEAD_STATUS_ORDER, leadStatusLabel } from "@/lib/leadStatus"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const maxDuration = 300

export default async function AdminAcquisitionPage() {
  await requireAdminSession()

  const missions = await prisma.mission.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { leads: true } } },
  })
  void missions

  const pendingDrafts = await prisma.emailDraft.count({ where: { status: "PENDING_APPROVAL" } })

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
    prisma.$queryRaw<Array<{ agentName: string; status: string; lastLog: string | null; updatedAt: Date }>>`
      SELECT "agentName", status, "lastLog", "updatedAt" FROM "AgentActivity" WHERE department = '01_ACQUISITION'
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
    for (const n of names) { const a = activityMap.get(n); if (a?.lastLog) return a.lastLog }
    return undefined
  }
  const agents: AgentInfo[] = [
    { id: "1", name: "Julien Servais", role: "Manager", persona: "Directeur de Mission", description: "Orchestre les 10 agents, planifie les missions et arbitre les priorités.", value: proof.missions, valueLabel: "Missions", status: statusOf(["Chief Acquisition AI"]), lastLog: logOf(["Chief Acquisition AI"]) },
    { id: "2", name: "Léa Dumont", role: "Sourcing", persona: "Market Scout", description: "Débusque les entreprises cibles via Exa et Google Places.", value: totalLeads, valueLabel: "Leads sourcés", status: statusOf(["Market Scout"]), lastLog: logOf(["Market Scout"]) },
    { id: "3", name: "Karim Haddad", role: "Audit", persona: "Intelligence Analyst", description: "Analyse la maturité web (Lighthouse, GMB) et extrait les contacts.", value: proof.audited, valueLabel: "Audits", status: statusOf(["Intelligence Analyst"]), lastLog: logOf(["Intelligence Analyst"]) },
    { id: "4", name: "Yassine Bouzid", role: "Scoring", persona: "Lead Scoring Analyst", description: "Note la valeur du prospect (0-100) sur des critères vérifiables.", value: proof.scored, valueLabel: "Leads scorés", status: statusOf(["Lead Scoring Analyst"]), lastLog: logOf(["Lead Scoring Analyst"]) },
    { id: "5", name: "Manon Verhoeven", role: "Rédaction", persona: "Creative Copywriter", description: "Rédige une accroche B2B sur-mesure ancrée dans l'audit réel.", value: proof.drafted, valueLabel: "Brouillons", status: statusOf(["Creative Copywriter", "Outreach Copywriter AI"]), lastLog: logOf(["Creative Copywriter", "Outreach Copywriter AI"]) },
    { id: "6", name: "Thibault Nguyen", role: "Envoi", persona: "RevOps Automator", description: "Envoie via Resend, vérifie la blacklist RGPD, synchronise le CRM.", value: proof.sent, valueLabel: "Emails envoyés", status: statusOf(["RevOps Automator"]), lastLog: logOf(["RevOps Automator"]) },
    { id: "7", name: "Adam Peeters", role: "LinkedIn", persona: "LinkedIn Outreach", description: "Identifie les décideurs LinkedIn et prépare des approches réelles.", value: proof.linkedin, valueLabel: "Contacts", status: statusOf(["LinkedIn Outreach Specialist"]), lastLog: logOf(["LinkedIn Outreach Specialist"]) },
    { id: "8", name: "Chloé Renard", role: "SEO Local", persona: "SEO Local Scout", description: "Compare la fiche Google du prospect face à son concurrent local.", value: proof.seo, valueLabel: "Audits SEO", status: statusOf(["SEO Local Scout"]), lastLog: logOf(["SEO Local Scout"]) },
    { id: "9", name: "Sofia Marchetti", role: "Ads", persona: "Ads Strategist", description: "Calibre le budget Meta/Google Ads et les seuils d'arrêt.", value: proof.ads, valueLabel: "Briefs Ads", status: statusOf(["Ads Strategist"]), lastLog: logOf(["Ads Strategist"]) },
    { id: "10", name: "Emma Lambrecht", role: "Partenariats", persona: "Referral & Partner", description: "Cartographie les apporteurs d'affaires locaux non concurrents.", value: proof.referral, valueLabel: "Partenaires", status: statusOf(["Referral Partnership Agent"]), lastLog: logOf(["Referral Partnership Agent"]) },
  ]
  const agentsActive = agents.filter((a) => a.status === "active").length

  const contactedCount = statusCounts["CONTACTED"] ?? 0
  const repliedCount = statusCounts["REPLIED"] ?? 0
  const meetingCount = statusCounts["MEETING_BOOKED"] ?? 0
  const avgScore = avgScoreResult._avg.score ? Math.round(avgScoreResult._avg.score) : 0

  const next =
    pendingDrafts > 0
      ? { value: pendingDrafts, label: "brouillons à valider", sub: "emails rédigés, prêts à l'envoi", href: "/admin/ai/acquisition/drafts", verb: "Valider" }
      : callableCount > 0
        ? { value: callableCount, label: "appels à passer", sub: "prospects avec numéro direct + script prêt", href: "/admin/ai/acquisition/calls", verb: "Commencer à appeler" }
        : repliedCount > 0
          ? { value: repliedCount, label: "réponses à traiter", sub: "des prospects attendent un retour", href: "/admin/ai/acquisition/inbox", verb: "Répondre" }
          : { value: totalLeads, label: "prospects en base", sub: "lance une mission pour en trouver plus", href: "/admin/ai/acquisition/crm", verb: "Explorer les leads" }

  const funnel = [
    { k: "Sourcés", v: totalLeads, pct: 100 },
    { k: "Contactés", v: contactedCount, pct: totalLeads ? Math.round((contactedCount / totalLeads) * 100) : 0 },
    { k: "Réponses", v: repliedCount, pct: totalLeads ? Math.round((repliedCount / totalLeads) * 100) : 0 },
    { k: "RDV", v: meetingCount, pct: totalLeads ? Math.round((meetingCount / totalLeads) * 100) : 0 },
  ]

  const kpis = [
    { l: "Leads en base", v: totalLeads, href: "/admin/ai/acquisition/crm" },
    { l: "Brouillons", v: pendingDrafts, href: "/admin/ai/acquisition/drafts" },
    { l: "À appeler", v: callableCount, href: "/admin/ai/acquisition/calls" },
    { l: "Missions actives", v: activeMissionsCount, href: null as string | null },
  ]

  return (
    <div className="h-full overflow-y-auto bg-[#060309]">
      <div className="max-w-[1480px] mx-auto space-y-6">

        {/* En-tête : Minimaliste & Clair */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#f8fafc] tracking-tight">Acquisition</h1>
            <p className="text-[13px] text-[#94a3b8] mt-1">Vue d&apos;ensemble du pipeline et des prochaines actions.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-medium px-3 py-1.5 rounded-lg bg-[#0f1014] border border-white/5 text-[#94a3b8]">Score global {avgScore}/100</span>
            <details className="relative group">
              <summary className="cursor-pointer list-none inline-flex items-center gap-1.5 rounded-lg bg-[#7c3aed] text-white text-[13px] font-medium px-4 py-2 hover:bg-[#6d28d9] transition-colors shadow-sm">+ Déployer une mission</summary>
              <div className="absolute right-0 top-11 z-30 w-80 p-5 rounded-xl border border-white/10 bg-[#0f1014] shadow-2xl space-y-4">
                <div className="text-[13px] font-semibold text-[#f8fafc] border-b border-white/5 pb-3">Nouvelle mission</div>
                <form action={launchMission} className="space-y-3.5">
                  {[
                    { id: "name", label: "Nom de code", ph: "ex : Coiffeurs Namur" },
                    { id: "sectors", label: "Secteur(s)", ph: "ex : Coiffure" },
                    { id: "locations", label: "Zone(s)", ph: "ex : Namur" },
                  ].map((f) => (
                    <div key={f.id}>
                      <label className="block text-[11px] font-medium text-[#94a3b8] mb-1.5" htmlFor={`m-${f.id}`}>{f.label}</label>
                      <input id={`m-${f.id}`} name={f.id} type="text" required placeholder={f.ph} className="w-full rounded-lg bg-[#1a1b1f] border border-white/5 px-3 py-2 text-[13px] text-[#f8fafc] placeholder:text-[#64748b] focus:outline-none focus:border-[#7c3aed] transition-colors" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[11px] font-medium text-[#94a3b8] mb-1.5" htmlFor="m-quota">Quota Cible (1-50)</label>
                    <input id="m-quota" name="maxLeads" type="number" min={1} max={50} defaultValue={15} required className="w-full rounded-lg bg-[#1a1b1f] border border-white/5 px-3 py-2 text-[13px] text-[#f8fafc] focus:outline-none focus:border-[#7c3aed] transition-colors" />
                  </div>
                  <button type="submit" className="w-full mt-2 py-2.5 rounded-lg bg-[#f8fafc] text-[#060309] text-[13px] font-semibold hover:bg-white transition-colors">Lancer l'opération</button>
                </form>
              </div>
            </details>
          </div>
        </div>

        {/* Le Cœur : Command Center & Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Command Queue : Minimaliste mais explicite */}
          <div className="lg:col-span-4 rounded-xl border border-white/5 bg-[#0f1014] p-6 flex flex-col justify-between relative overflow-hidden">
            {/* Glow de fond subtil si alerte */}
            {(pendingDrafts > 0 || callableCount > 0) && (
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#ef4444] opacity-5 blur-[50px] rounded-full pointer-events-none" />
            )}
            <div>
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-medium text-[#94a3b8]">Prochaine Action</div>
                {(pendingDrafts > 0 || callableCount > 0) && (
                  <span className="flex h-2 w-2 rounded-full bg-[#ef4444]" />
                )}
              </div>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-5xl font-semibold tabular-nums tracking-tight text-[#f8fafc]">{next.value}</span>
                <span className="text-[14px] font-medium text-[#64748b]">{next.label}</span>
              </div>
              <p className="mt-2 text-[13px] text-[#94a3b8] leading-relaxed">{next.sub}</p>
            </div>
            <Link href={next.href} className="mt-8 inline-flex w-max items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-colors bg-[#1a1b1f] border border-white/5 text-[#f8fafc] hover:bg-[#212226]">
              {next.verb} →
            </Link>
          </div>

          {/* Situation de l'entonnoir */}
          <div className="lg:col-span-5 rounded-xl border border-white/5 bg-[#0f1014] p-6">
            <div className="text-[12px] font-medium text-[#94a3b8] mb-6">Pipeline de conversion</div>
            <div className="grid grid-cols-4 gap-4">
              {funnel.map((f) => (
                <div key={f.k}>
                  <div className="text-3xl font-semibold tabular-nums text-[#f8fafc] tracking-tight">{f.v}</div>
                  <div className="text-[12px] text-[#64748b] mt-1 mb-3">{f.k}</div>
                  <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(3, f.pct)}%`, background: f.k === "RDV" ? "#10b981" : "#7c3aed" }} />
                  </div>
                  <div className="text-[11px] font-medium text-[#94a3b8] mt-2 tabular-nums">{f.pct}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Macro KPIs rapides */}
          <div className="lg:col-span-3 grid grid-cols-2 gap-4">
            {kpis.map((k) => {
              const inner = (
                <div className="flex flex-col h-full justify-center">
                  <div className="text-2xl font-semibold tabular-nums text-[#f8fafc] tracking-tight">{k.v}</div>
                  <div className="text-[11px] text-[#94a3b8] mt-1 leading-tight">{k.l}</div>
                </div>
              )
              return k.href ? (
                <Link key={k.l} href={k.href} className="rounded-xl border border-white/5 bg-[#0f1014] p-4 hover:bg-[#1a1b1f] transition-colors">{inner}</Link>
              ) : (
                <div key={k.l} className="rounded-xl border border-white/5 bg-[#0f1014] p-4">{inner}</div>
              )
            })}
          </div>
        </div>

        {/* Équipe IA — 10 agents */}
        <AgentCommandGrid agents={agents} />

        {/* Pipeline compact par étape */}
        <div className="rounded-xl border border-white/5 bg-[#0f1014] p-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
            <span className="text-[12px] font-medium text-[#94a3b8]">Répartition des statuts CRM</span>
            <Link href="/admin/ai/acquisition/crm" className="text-[12px] font-medium text-[#7c3aed] hover:text-[#6d28d9] transition-colors">Consulter la base →</Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {LEAD_STATUS_ORDER.filter((s) => s !== "BOUNCED").map((s) => (
              <Link key={s} href={`/admin/ai/acquisition/crm?status=${s}`} className="rounded-lg border border-white/5 bg-[#060309] px-4 py-3 hover:bg-[#1a1b1f] transition-colors flex flex-col justify-between">
                <div className="text-2xl font-semibold tabular-nums text-[#f8fafc] tracking-tight">{statusCounts[s] ?? 0}</div>
                <div className="text-[11px] font-medium text-[#64748b] mt-1.5">{leadStatusLabel(s)}</div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
