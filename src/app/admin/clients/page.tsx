import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import Link from "next/link"
import type { Prisma } from "@prisma/client"
import { formatDate, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from "@/lib/adminFormat"

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
    <div className="space-y-5">
      {/* Header Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">Repertoire CRM · {totalClientsCount} client(s)</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">Base Clients</h1>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/admin/export/clients${query ? `?q=${encodeURIComponent(query)}` : ""}`}
            download
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors shrink-0"
          >
            ↓ Exporter CSV
          </a>
        </div>
      </div>

      {/* KPI Ribbon Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-md">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Total Clients</span>
          <p className="text-xl font-bold text-white tabular-nums mt-0.5">{totalClientsCount}</p>
        </div>
        <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Accès Activés</span>
          <p className="text-xl font-bold text-emerald-400 tabular-nums mt-0.5">{totalClientsCount - pendingActivationCount}</p>
        </div>
        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Accès Non-Activés</span>
          <p className="text-xl font-bold text-amber-400 tabular-nums mt-0.5">{pendingActivationCount}</p>
        </div>
      </div>

      {/* Search Input Bar */}
      <form method="get" className="flex items-center gap-2 bg-white/[0.02] border border-white/10 rounded-xl p-3">
        <input
          id="client-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Rechercher un client par nom ou e-mail…"
          className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition-all"
        />
        <button
          type="submit"
          className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
        >
          Chercher
        </button>
        {query && (
          <Link
            href="/admin/clients"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Effacer
          </Link>
        )}
      </form>

      {/* Clients High-Density Table */}
      <div className="rounded-xl border border-white/10 bg-white/[0.01] overflow-hidden backdrop-blur-xl">
        {clients.length === 0 ? (
          <p className="p-8 text-xs text-zinc-500 text-center">
            {query ? `Aucun client ne correspond à « ${query} ».` : "Aucun client enregistré."}
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {clients.map((client) => {
              const activeProjects = client.projects.filter((p) => p.status !== "COMPLETED" && p.status !== "CANCELLED")
              const latest = client.projects[0]
              return (
                <Link
                  key={client.id}
                  href={`/admin/clients/${client.id}`}
                  className="flex items-center justify-between gap-4 p-3.5 hover:bg-white/[0.03] transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-xs text-white group-hover:text-violet-300 transition-colors truncate">
                        {client.name || "Client anonyme"}
                      </p>
                      {!client.passwordHash && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Invitation en attente
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono truncate mt-0.5">{client.email}</p>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      Client depuis le {formatDate(client.createdAt)}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    {latest ? (
                      <>
                        <p className="text-xs font-semibold text-zinc-200 truncate max-w-[200px]">{latest.name}</p>
                        <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded inline-block mt-1 ${PROJECT_STATUS_COLORS[latest.status] ?? "bg-white/10 text-zinc-300"}`}>
                          {PROJECT_STATUS_LABELS[latest.status] ?? latest.status}
                        </span>
                        {client.projects.length > 1 && (
                          <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
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
  )
}
