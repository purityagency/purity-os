import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { FinanceIcon, AlertTriangleIcon } from "@/components/icons"

export default async function AdminAiFinancePage() {
  await requireAdminSession()

  return (
    <div className="h-[calc(100vh-90px)] flex flex-col space-y-4 overflow-hidden">
      {/* Header Compact */}
      <div className="shrink-0 space-y-3 border-b border-white/5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Finance & Administration · Pôle 02</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
              <FinanceIcon className="w-6 h-6 text-emerald-400" />
              <span>Pilotage IA Finance</span>
            </h1>
          </div>
        </div>

        {/* KPI Ribbon Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Agents Facturation</span>
            <span className="text-base font-bold text-emerald-400 tabular-nums">0 Actifs</span>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Rapports Financiers</span>
            <span className="text-base font-bold text-white tabular-nums">0</span>
          </div>
        </div>
      </div>

      {/* Main Fit-To-Screen Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 overflow-hidden">
        {/* Left (2/3 width) - System Event Feed */}
        <div className="lg:col-span-2 flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <FinanceIcon className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Event Feed Pôle Finance</h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">Live</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
              <FinanceIcon className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-400">En attente d&apos;événements de l&apos;agent financier.</p>
            </div>
          </div>
        </div>

        {/* Right (1/3 width) - AI Agent Status */}
        <div className="flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden justify-between space-y-4">
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangleIcon className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                  État des Agents (Live)
                </h2>
              </div>
            </div>
            <div className="space-y-2">
                <p className="text-[11px] text-zinc-500 font-mono p-4 border border-dashed border-white/5 rounded-xl bg-black/20 text-center">Nathalie Coppens (Chief Finance AI) : Dormante.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
