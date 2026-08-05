import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { createProjectWithClient } from "@/actions/projectActions"
import Link from "next/link"
import type { Prisma } from "@prisma/client"
import { formatDate, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, sectorLabel } from "@/lib/adminFormat"

const VALID_STATUSES = ["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  await requireAdminSession()
  const sp = await searchParams
  const statusFilter = VALID_STATUSES.includes(sp.status as (typeof VALID_STATUSES)[number]) ? sp.status : undefined
  const query = (sp.q ?? "").trim().slice(0, 100)

  const where: Prisma.ProjectWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { client: { name: { contains: query, mode: "insensitive" as const } } },
            { client: { email: { contains: query, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  }

  const [projects, activeCount, completedCount, onHoldCount] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        client: { select: { id: true, name: true, email: true } },
        stages: { select: { status: true } },
      },
    }),
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.project.count({ where: { status: "COMPLETED" } }),
    prisma.project.count({ where: { status: "ON_HOLD" } }),
  ])

  const buildHref = (status?: string) => {
    const params = new URLSearchParams()
    if (status) params.set("status", status)
    if (query) params.set("q", query)
    const qs = params.toString()
    return qs ? `/admin/projects?${qs}` : "/admin/projects"
  }

  return (
    <div className="space-y-5">
      {/* Header Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">Projets · {projects.length} dossier(s)</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">Gestion des Projets</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Nouveau Projet Toggle Form */}
          <details className="relative group">
            <summary className="cursor-pointer list-none px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-md shadow-violet-600/20">
              + Nouveau Projet
            </summary>
            <div className="absolute right-0 top-10 z-30 w-80 p-4 rounded-xl border border-white/10 bg-[#0d0714] backdrop-blur-2xl shadow-2xl space-y-3">
              <p className="font-bold text-xs text-white">Créer un nouveau projet client</p>
              <form action={createProjectWithClient} className="space-y-2.5">
                <div>
                  <label htmlFor="clientName" className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Nom du client</label>
                  <input id="clientName" name="clientName" required maxLength={200} className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500" placeholder="Ex: Marie Vandenbroucke" />
                </div>
                <div>
                  <label htmlFor="clientEmail" className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">E-mail du client</label>
                  <input id="clientEmail" name="clientEmail" type="email" required className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500" placeholder="marie@salon-eclat.be" />
                </div>
                <div>
                  <label htmlFor="projectName" className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Nom du projet</label>
                  <input id="projectName" name="projectName" required maxLength={200} className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500" placeholder="Site vitrine + réservation" />
                </div>
                <div>
                  <label htmlFor="estimatedDelivery" className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Livraison estimée</label>
                  <input id="estimatedDelivery" name="estimatedDelivery" type="date" className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500" />
                </div>
                <button type="submit" className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white transition-all cursor-pointer">
                  Créer et envoyer l&apos;accès
                </button>
              </form>
            </div>
          </details>

          <a
            href={`/api/admin/export/projects${statusFilter ? `?status=${statusFilter}` : ""}`}
            download
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors shrink-0"
          >
            ↓ CSV
          </a>
        </div>
      </div>

      {/* KPI Ribbon Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-md">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Actifs</span>
          <p className="text-xl font-bold text-white tabular-nums mt-0.5">{activeCount}</p>
        </div>
        <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Terminés</span>
          <p className="text-xl font-bold text-emerald-400 tabular-nums mt-0.5">{completedCount}</p>
        </div>
        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">En Pause</span>
          <p className="text-xl font-bold text-amber-400 tabular-nums mt-0.5">{onHoldCount}</p>
        </div>
        <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-md">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Total Projets</span>
          <p className="text-xl font-bold text-zinc-300 tabular-nums mt-0.5">{activeCount + completedCount + onHoldCount}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] border border-white/10 rounded-xl p-3">
        <form method="get" className="flex items-center gap-2 flex-1 min-w-[220px]">
          <input
            id="project-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Rechercher un projet ou client…"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition-all"
          />
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Link
            href={buildHref()}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              !statusFilter ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Tous
          </Link>
          {VALID_STATUSES.map((status) => (
            <Link
              key={status}
              href={buildHref(status)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                statusFilter === status ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {PROJECT_STATUS_LABELS[status]}
            </Link>
          ))}
        </div>
      </div>

      {/* Projects High-Density Table */}
      <div className="rounded-xl border border-white/10 bg-white/[0.01] overflow-hidden backdrop-blur-xl">
        {projects.length === 0 ? (
          <p className="p-8 text-xs text-zinc-500 text-center">
            {query || statusFilter ? "Aucun projet ne correspond à ce critère." : "Aucun projet enregistré."}
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {projects.map((project) => {
              const done = project.stages.filter((s) => s.status === "COMPLETED").length
              const total = project.stages.length
              const percent = total > 0 ? Math.round((done / total) * 100) : 0
              const overdue =
                project.estimatedDelivery &&
                new Date(project.estimatedDelivery) < new Date() &&
                project.status !== "COMPLETED" &&
                project.status !== "CANCELLED"

              return (
                <Link
                  key={project.id}
                  href={`/admin/projects/${project.id}`}
                  className="flex items-center justify-between gap-4 p-3.5 hover:bg-white/[0.03] transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-xs text-white group-hover:text-violet-300 transition-colors truncate">{project.name}</p>
                      {sectorLabel(project.sector) && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-zinc-400 border border-white/5">
                          {sectorLabel(project.sector)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {project.client.name || project.client.email}
                    </p>
                  </div>

                  {/* Progress bar */}
                  {total > 0 && (
                    <div className="hidden md:flex items-center gap-2 w-44 shrink-0">
                      <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-600 to-indigo-400 rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 tabular-nums">{done}/{total}</span>
                    </div>
                  )}

                  <div className="text-right shrink-0">
                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${PROJECT_STATUS_COLORS[project.status] ?? "bg-white/10 text-zinc-300"}`}>
                      {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                    </span>
                    <p className={`text-[10px] font-mono mt-1 ${overdue ? "text-red-400 font-bold" : "text-zinc-500"}`}>
                      {project.estimatedDelivery ? formatDate(project.estimatedDelivery) : "Sans échéance"}
                      {overdue ? " (En retard)" : ""}
                    </p>
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
