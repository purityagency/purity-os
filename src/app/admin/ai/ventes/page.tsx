import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { UsersIcon, MailIcon } from "@/components/icons"
import Link from "next/link"
import { formatDate } from "@/lib/adminFormat"

export default async function AdminVentesPage() {
  await requireAdminSession()

  // Fetch active clients
  const activeClients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    include: {
      projects: { select: { id: true, name: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10
  })

  const totalClients = await prisma.user.count({ where: { role: "CLIENT" } })

  // Mocked customer success metrics
  const onboardingsInProgress = 0
  const npsScore = 9.2
  const openTickets = 0

  return (
    <div className="h-[calc(100vh-90px)] flex flex-col space-y-4 overflow-hidden">
      {/* Header Compact */}
      <div className="shrink-0 space-y-3 border-b border-white/5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Ventes & Clients · Pôle 05</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
              <UsersIcon className="w-6 h-6 text-pink-400" />
              <span>Customer Success & Support</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors shrink-0">
              Envoyer Campagne NPS
            </button>
          </div>
        </div>

        {/* KPI Ribbon Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-pink-500/20 bg-pink-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Clients Actifs</span>
            <span className="text-base font-bold text-pink-400 tabular-nums">{totalClients}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Onboardings</span>
            <span className="text-base font-bold text-white tabular-nums">{onboardingsInProgress} en cours</span>
          </div>
          <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">NPS Global</span>
            <span className="text-base font-bold text-emerald-400 tabular-nums">{npsScore} / 10</span>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Tickets Support</span>
            <span className="text-base font-bold text-amber-400 tabular-nums">{openTickets} ouverts</span>
          </div>
        </div>
      </div>

      {/* Main Fit-To-Screen Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 overflow-hidden">
        {/* Left (2/3 width) - Client Health */}
        <div className="lg:col-span-2 flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-pink-400" />
              <h2 className="text-sm font-bold text-white">État de Santé Clients (Health Score)</h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">{activeClients.length} clients affichés</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {activeClients.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
                <UsersIcon className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400">Aucun client actif dans la base.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeClients.map((client) => (
                  <Link
                    key={client.id}
                    href={`/admin/clients/${client.id}`}
                    className="flex justify-between items-center p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-white">{client.name || client.email}</h3>
                      <p className="text-[10px] text-zinc-500 font-mono">Inscrit le {formatDate(client.createdAt)} · {client.projects.length} projet(s)</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Excellent
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right (1/3 width) - Recent Interactions */}
        <div className="flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden justify-between space-y-4">
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <MailIcon className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                  Interactions Récentes
                </h2>
              </div>
            </div>

            <div className="p-4 border border-dashed border-white/5 rounded-xl bg-black/20 text-center">
              <p className="text-[11px] text-zinc-500 font-mono">Aucun ticket de support récent.</p>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-white/5 bg-black/40 text-[10px] text-zinc-500 font-mono">
            Customer Success Agent (Ventes AI)
          </div>
        </div>
      </div>
    </div>
  )
}
