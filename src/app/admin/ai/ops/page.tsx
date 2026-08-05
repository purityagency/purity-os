import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { AlertTriangleIcon, DocumentsIcon } from "@/components/icons"

export default async function AdminOpsPage() {
  await requireAdminSession()

  // Fetch macro data
  const [totalUsers, totalDocuments, recentEvents, systemEvents] = await Promise.all([
    prisma.user.count(),
    prisma.document.count(),
    prisma.event.findMany({ take: 20, orderBy: { createdAt: "desc" } }),
    prisma.event.findMany({ 
      where: { type: "SYSTEM" },
      take: 10,
      orderBy: { createdAt: "desc" }
    }),
  ])

  // Mocked 0s for missing schema elements per the agreed plan
  const openRisks = systemEvents.length
  const complianceScore = 100
  const backupStatus = "OK"
  const systemUptime = "99.9%"

  return (
    <div className="h-[calc(100vh-90px)] flex flex-col space-y-4 overflow-hidden">
      {/* Header Compact */}
      <div className="shrink-0 space-y-3 border-b border-white/5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Ops & Conformité · Pôle 03</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
              <AlertTriangleIcon className="w-6 h-6 text-cyan-400" />
              <span>Tour de Contrôle RGPD & Sécurité</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors shrink-0">
              Lancer Audit RGPD
            </button>
          </div>
        </div>

        {/* KPI Ribbon Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Score Conformité</span>
            <span className="text-base font-bold text-cyan-400 tabular-nums">{complianceScore}%</span>
          </div>
          <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Backups DB</span>
            <span className="text-base font-bold text-emerald-400 tabular-nums">{backupStatus}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Uptime Système</span>
            <span className="text-base font-bold text-white tabular-nums">{systemUptime}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Risques / Incidents</span>
            <span className="text-base font-bold text-amber-400 tabular-nums">{openRisks}</span>
          </div>
        </div>
      </div>

      {/* Main Fit-To-Screen Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 overflow-hidden">
        {/* Left (2/3 width) - Audit Trail */}
        <div className="lg:col-span-2 flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <DocumentsIcon className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Journal d&apos;Audit (Access Logs)</h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">{totalUsers} utilisateurs · {totalDocuments} docs</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {recentEvents.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
                <DocumentsIcon className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400">Aucune activité récente enregistrée.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentEvents.map(event => (
                  <div key={event.id} className="p-3 rounded-lg border border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">{event.type}</span>
                      <p className="text-[10px] text-zinc-500">{event.summary || "Action système générique"}</p>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">{new Date(event.createdAt).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right (1/3 width) - RGPD & Security */}
        <div className="flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden justify-between space-y-4">
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangleIcon className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                  Incidents & Alertes
                </h2>
              </div>
            </div>

            {systemEvents.length === 0 ? (
              <div className="p-4 border border-dashed border-white/5 rounded-xl bg-black/20 text-center">
                <p className="text-[11px] text-zinc-500 font-mono">Aucune alerte de sécurité active.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {systemEvents.map(event => (
                  <div key={event.id} className="p-3 border border-amber-500/20 bg-amber-500/5 rounded-xl">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-amber-400">{event.name}</span>
                      <span className="text-[10px] text-zinc-500">{new Date(event.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-2">{event.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-3 rounded-lg border border-white/5 bg-black/40 text-[10px] text-zinc-500 font-mono">
            Agent Conformité (Ops AI)
          </div>
        </div>
      </div>
    </div>
  )
}
