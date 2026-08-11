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
    <div className="h-full overflow-y-auto bg-[#f6f7f9]">
      <div className="max-w-[1480px] mx-auto px-5 lg:px-8 py-5 space-y-4">

        {/* En-tête */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#17171a] tracking-tight">Acquisition</h1>
            <p className="text-[13px] text-[#5b616e] mt-0.5">Ton pipeline et la prochaine action, en un coup d&apos;œil.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white border border-[#e6e7eb] text-[#5b616e]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />{agentsActive}/10 agents actifs
            </span>
            <span className="hidden sm:inline text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white border border-[#e6e7eb] text-[#5b616e]">Score moyen {avgScore}/100</span>
            <details className="relative group">
              <summary className="cursor-pointer list-none inline-flex items-center gap-1.5 rounded-lg bg-[#17171a] text-white text-sm font-semibold px-3.5 py-1.5 hover:bg-black transition">+ Lancer une mission</summary>
              <div className="absolute right-0 top-11 z-30 w-80 p-4 rounded-xl border border-[#e6e7eb] bg-white shadow-xl space-y-3">
                <div className="text-sm font-semibold text-[#17171a]">Nouvelle mission de prospection</div>
                <form action={launchMission} className="space-y-2.5">
                  {[
                    { id: "name", label: "Nom", ph: "ex : Coiffeurs Namur" },
                    { id: "sectors", label: "Secteur(s)", ph: "ex : Coiffure & Beauté" },
                    { id: "locations", label: "Ville(s)", ph: "ex : Namur, Charleroi" },
                  ].map((f) => (
                    <div key={f.id}>
                      <label className="block text-[11px] font-medium text-[#5b616e] mb-1" htmlFor={`m-${f.id}`}>{f.label}</label>
                      <input id={`m-${f.id}`} name={f.id} type="text" required placeholder={f.ph} className="w-full rounded-lg bg-white border border-[#e6e7eb] px-3 py-2 text-sm text-[#17171a] placeholder:text-[#a2a7b0] focus:outline-none focus:border-[#4f46e5]" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[11px] font-medium text-[#5b616e] mb-1" htmlFor="m-quota">Quota (1-50)</label>
                    <input id="m-quota" name="maxLeads" type="number" min={1} max={50} defaultValue={15} required className="w-full rounded-lg bg-white border border-[#e6e7eb] px-3 py-2 text-sm text-[#17171a] focus:outline-none focus:border-[#4f46e5]" />
                  </div>
                  <button type="submit" className="w-full py-2 rounded-lg bg-[#17171a] text-white text-sm font-semibold hover:bg-black transition">Exécuter</button>
                </form>
              </div>
            </details>
          </div>
        </div>

        {/* Bande : prochaine action + entonnoir + KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-4 rounded-xl border border-[#e6e7eb] bg-white p-5 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#8a909c]">Prochaine action</div>
              <div className="mt-3 flex items-baseline gap-2.5">
                <span className="text-5xl font-bold tabular-nums text-[#17171a] leading-none">{next.value}</span>
                <span className="text-sm text-[#5b616e]">{next.label}</span>
              </div>
              <p className="mt-2 text-[13px] text-[#8a909c]">{next.sub}</p>
            </div>
            <Link href={next.href} className="mt-5 inline-flex w-max items-center gap-2 rounded-lg bg-[#17171a] text-white text-sm font-semibold px-4 py-2 hover:bg-black transition">{next.verb} →</Link>
          </div>

          <div className="lg:col-span-5 rounded-xl border border-[#e6e7eb] bg-white p-5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#8a909c] mb-4">Entonnoir de conversion</div>
            <div className="grid grid-cols-4 gap-3">
              {funnel.map((f) => (
                <div key={f.k}>
                  <div className="text-2xl font-bold tabular-nums text-[#17171a] leading-none">{f.v}</div>
                  <div className="text-[12px] text-[#5b616e] mt-1">{f.k}</div>
                  <div className="mt-2 h-1.5 rounded-full bg-[#eceef2] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(3, f.pct)}%`, background: f.k === "RDV" ? "#059669" : "#4f46e5" }} />
                  </div>
                  <div className="text-[10px] text-[#a2a7b0] mt-1 tabular-nums">{f.pct}%</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 grid grid-cols-2 gap-3">
            {kpis.map((k) => {
              const inner = (
                <>
                  <div className="text-2xl font-bold tabular-nums text-[#17171a] leading-none">{k.v}</div>
                  <div className="text-[11px] text-[#5b616e] mt-1.5">{k.l}</div>
                </>
              )
              return k.href ? (
                <Link key={k.l} href={k.href} className="rounded-xl border border-[#e6e7eb] bg-white p-3.5 hover:border-[#4f46e5]/50 hover:bg-[#fafaff] transition-colors">{inner}</Link>
              ) : (
                <div key={k.l} className="rounded-xl border border-[#e6e7eb] bg-white p-3.5">{inner}</div>
              )
            })}
          </div>
        </div>

        {/* Équipe IA — 10 agents */}
        <AgentCommandGrid agents={agents} />

        {/* Pipeline compact par étape */}
        <div className="rounded-xl border border-[#e6e7eb] bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#8a909c]">Pipeline</span>
            <Link href="/admin/ai/acquisition/crm" className="text-[12px] font-medium text-[#4f46e5] hover:underline">Voir tous les leads →</Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {LEAD_STATUS_ORDER.filter((s) => s !== "BOUNCED").map((s) => (
              <Link key={s} href={`/admin/ai/acquisition/crm?status=${s}`} className="rounded-lg border border-[#e6e7eb] bg-[#fafbfc] px-3 py-2.5 hover:border-[#4f46e5]/50 transition-colors">
                <div className="text-xl font-bold tabular-nums text-[#17171a] leading-none">{statusCounts[s] ?? 0}</div>
                <div className="text-[11px] text-[#5b616e] mt-1 truncate">{leadStatusLabel(s)}</div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
