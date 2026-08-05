import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import Link from "next/link"
import type { Prisma } from "@prisma/client"
import { formatDate, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from "@/lib/adminFormat"
import { UsersIcon, SparklesIcon, SearchIcon } from "@/components/icons"

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  await requireAdminSession()
  const sp = await searchParams
  const query = (sp.q ?? "").trim().slice(0, 100)

  const where: Prisma.UserWhereInput = {
    role: "CLIENT",
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [clients, totalClientsCount, pendingActivationCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        projects: { orderBy: { updatedAt: "desc" } },
      },
    }),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.user.count({ where: { role: "CLIENT", passwordHash: null } }),
  ])

  return (
    <div className="h-[calc(100vh-90px)] flex flex-col space-y-4 overflow-hidden">
      {/* Header Compact */}
      <div className="shrink-0 space-y-3 border-b border-white/5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Ventes & Relation Client · Pôle 05</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
              <UsersIcon className="w-6 h-6 text-violet-400" />
              <span>Base Clients & Répertoire CRM</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/api/admin/export/clients${query ? `?q=${encodeURIComponent(query)}` : ""}`}
              download
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors shrink-0"
            >
              ↓ Export Clients CSV
            </a>
          </div>
        </div>

        {/* KPI Ribbon Strip */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Total Clients</span>
            <span className="text-base font-bold text-white tabular-nums">{totalClientsCount} comptes</span>
          </div>
          <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Portail Activé</span>
            <span className="text-base font-bold text-emerald-400 tabular-nums">{totalClientsCount - pendingActivationCount} activés</span>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Invitation En Attente</span>
            <span className="text-base font-bold text-amber-400 tabular-nums">{pendingActivationCount} en attente</span>
          </div>
        </div>
      </div>

      {/* Main Content Split Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 overflow-hidden">
        {/* Left (2/3 width) - Clients Table */}
        <div className="lg:col-span-2 flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden">
          {/* Search Bar */}
          <form method="get" className="flex items-center gap-2 mb-3 shrink-0 text-xs">
            <SearchIcon className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              id="client-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Chercher un client par nom ou e-mail…"
              className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-500 focus:outline-none"
            />
            {query && (
              <Link
                href="/admin/clients"
                className="text-[10px] font-mono text-zinc-400 hover:text-white transition-colors"
              >
                Effacer
              </Link>
            )}
          </form>

          <div className="flex-1 overflow-y-auto pr-1">
            {clients.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
                <UsersIcon className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400">
                  {query ? `Aucun client ne correspond à « ${query} ».` : "Aucun client enregistré."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden bg-black/30">
                {clients.map((client) => {
                  const activeProjects = client.projects.filter((p) => p.status !== "COMPLETED" && p.status !== "CANCELLED")
                  const latest = client.projects[0]
                  return (
                    <Link
                      key={client.id}
                      href={`/admin/clients/${client.id}`}
                      className="flex items-center justify-between gap-3 p-3 hover:bg-white/[0.03] transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-white group-hover:text-violet-300 transition-colors truncate">
                            {client.name || "Client anonyme"}
                          </p>
                          {!client.passwordHash && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Invitation en attente
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 font-mono truncate mt-0.5">{client.email}</p>
                        <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
                          Client depuis le {formatDate(client.createdAt)}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {latest ? (
                          <>
                            <p className="text-xs font-bold text-zinc-200 truncate max-w-[180px]">{latest.name}</p>
                            <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded inline-block mt-0.5 ${PROJECT_STATUS_COLORS[latest.status] ?? "bg-white/10 text-zinc-300"}`}>
                              {PROJECT_STATUS_LABELS[latest.status] ?? latest.status}
                            </span>
                            {client.projects.length > 1 && (
                              <p className="text-[9px] font-mono text-zinc-500 mt-0.5">
                                {client.projects.length} projets ({activeProjects.length} actif)
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] text-zinc-500 font-mono">Aucun projet</span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right (1/3 width) - Sales & Client Relationship Engine */}
        <div className="flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden justify-between space-y-4">
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <SparklesIcon className="w-4 h-4 text-violet-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                  Suivi Client & Satisfaction (NPS)
                </h2>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Supervision directe du parcours d&apos;intégration et du niveau de satisfaction des PME et artisans accompagnés.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-violet-500/20 bg-violet-500/5 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-400">Chief Sales AI:</span>
                <span className="text-white font-bold">Vincent Delcourt</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Client Success:</span>
                <span className="text-emerald-400 font-bold">Charlotte Hermans</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Accès Portail:</span>
                <span className="text-cyan-400 font-bold">SSL 48h Token</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-white/5 bg-black/40 text-[10px] text-zinc-500 font-mono">
            Purity OS Sales & Client Pole
          </div>
        </div>
      </div>
    </div>
  )
}
