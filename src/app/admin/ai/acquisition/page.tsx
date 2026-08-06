import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { launchMission } from "@/actions/acquisitionActions"
import Link from "next/link"
import { MissionTracker } from "./MissionTracker"
import { PipelineKanban } from "./PipelineKanban"

export const dynamic = "force-dynamic"
export const revalidate = 0

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

  // KPI Calculations (parallel)
  const [totalLeads, avgScoreResult, activeMissionsCount, contactedCount, repliedCount, meetingCount] =
    await Promise.all([
      prisma.lead.count(),
      prisma.lead.aggregate({ _avg: { score: true } }),
      prisma.mission.count({ where: { status: "ACTIVE" } }),
      prisma.lead.count({ where: { status: "CONTACTED" } }),
      prisma.lead.count({ where: { status: "REPLIED" } }),
      prisma.lead.count({ where: { status: "MEETING_BOOKED" } }),
    ])

  const avgScore = avgScoreResult._avg.score ? Math.round(avgScoreResult._avg.score) : 0
  const engagedCount = contactedCount + repliedCount + meetingCount
  const conversionRate = totalLeads > 0 ? Math.round((engagedCount / totalLeads) * 100) : 0

  return (
    <div className="h-full flex flex-col space-y-4 p-4 lg:p-8">
      {/* Top Header & Compact KPI Bar (Fixed) */}
      <div className="shrink-0 space-y-3 border-b border-white/5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Acquisition · Pôle 01</span>
            </div>
            <h1 className="text-xl font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
              Pôle 01: Pipeline Prospection
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Launch Mission Modal Trigger */}
            <details className="relative group">
              <summary className="cursor-pointer list-none px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-md shadow-violet-600/20">
                + Lancer Scan AI
              </summary>
              <div className="absolute right-0 top-10 z-30 w-80 p-4 rounded-xl border border-white/10 bg-[#0d0714] backdrop-blur-2xl shadow-2xl space-y-3">
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

        {/* Compact KPI Strip (1 tight row) */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Missions</span>
            <span className="text-base font-bold text-white tabular-nums">{activeMissionsCount} actives</span>
          </div>
          
          <Link href="/admin/ai/acquisition/crm" className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-violet-500/50 transition-all cursor-pointer group">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate group-hover:text-violet-300 transition-colors">Leads Sourcés ↗</span>
            <span className="text-base font-bold text-white tabular-nums">{totalLeads} total</span>
          </Link>

          <div className="p-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Score Qualité</span>
            <span className="text-base font-bold text-violet-400 tabular-nums">{avgScore}/100</span>
          </div>
          <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Engagement</span>
            <span className="text-base font-bold text-emerald-400 tabular-nums">{conversionRate}%</span>
          </div>

          <Link href="/admin/ai/acquisition/drafts" className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all cursor-pointer group">
            <span className="text-[9px] font-mono uppercase tracking-wider text-amber-500/70 block truncate group-hover:text-amber-400 transition-colors">Brouillons ↗</span>
            <span className="text-base font-bold text-amber-400 tabular-nums">{pendingDrafts.length} à valider</span>
          </Link>

          <Link href="/admin/ai/acquisition/outbox" className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all cursor-pointer group">
            <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-500/70 block truncate group-hover:text-emerald-400 transition-colors">Envoyés ↗</span>
            <span className="text-base font-bold text-emerald-400 tabular-nums">{contactedCount} mails</span>
          </Link>
        </div>
      </div>

      {/* Main Fit-to-Screen Split Area (Flex 1) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0 overflow-hidden">
        <div className="lg:col-span-3 flex flex-col h-full overflow-hidden relative">
          <div className="flex-1 min-h-0 relative">
            <PipelineKanban leads={allLeads} />
          </div>
        </div>

        {/* Right: Missions Sidebar (1/4 width) - Internal Scroll */}
        <div className="flex flex-col h-full border-l border-white/5 bg-[#0a0510] p-4 overflow-hidden relative">
          <div className="absolute inset-0 bg-violet-900/5 backdrop-blur-[2px]"></div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono mb-3 shrink-0 relative z-10">
            Suivi des Missions d&apos;Acquisition
          </h2>

          <div className="flex-1 overflow-y-auto pr-1 relative z-10">
            <MissionTracker missions={missions as never} />
          </div>
        </div>
      </div>
    </div>
  )
}
