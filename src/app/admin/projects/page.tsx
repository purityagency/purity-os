import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { createProjectWithClient } from "@/actions/projectActions"
import Link from "next/link"
import type { Prisma } from "@prisma/client"
import { formatDate, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, sectorLabel } from "@/lib/adminFormat"
import { ProjectsIcon, SparklesIcon, SearchIcon } from "@/components/icons"

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
    <div className="h-[calc(100vh-90px)] flex flex-col space-y-4 overflow-hidden">
      {/* Header Compact */}
      <div className="shrink-0 space-y-3 border-b border-white/5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Production Digitale · Pôle 04</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
              <ProjectsIcon className="w-6 h-6 text-violet-400" />
              <span>Studio Production & Livrables</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/api/admin/export/projects${statusFilter ? `?status=${statusFilter}` : ""}`}
              download
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors shrink-0"
            >
              ↓ Export CSV
            </a>
          </div>
        </div>

        {/* KPI Ribbon Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Actifs</span>
            <span className="text-base font-bold text-violet-400 tabular-nums">{activeCount} projets</span>
          </div>
          <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Terminés</span>
            <span className="text-base font-bold text-emerald-400 tabular-nums">{completedCount} livrés</span>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">En Pause</span>
            <span className="text-base font-bold text-amber-400 tabular-nums">{onHoldCount} en attente</span>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Total Projets</span>
            <span className="text-base font-bold text-white tabular-nums">{activeCount + completedCount + onHoldCount}</span>
          </div>
        </div>
      </div>

      {/* Main Content Split Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 overflow-hidden">
        {/* Left (2/3 width) - Projects Table */}
        <div className="lg:col-span-2 flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden">
          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 shrink-0 text-xs">
            <form method="get" className="flex items-center gap-2 flex-1 min-w-[180px]">
              <SearchIcon className="w-4 h-4 text-zinc-500 shrink-0" />
              <input
                id="project-search"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Chercher un projet ou un client…"
                className="w-full bg-transparent text-xs text-white placeholder:text-zinc-500 focus:outline-none"
              />
              {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            </form>

            <div className="flex items-center gap-1 overflow-x-auto">
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

          <div className="flex-1 overflow-y-auto pr-1">
            {projects.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
                <ProjectsIcon className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400">
                  {query || statusFilter ? "Aucun projet ne correspond à ce critère." : "Aucun projet enregistré."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden bg-black/30">
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
                      className="flex items-center justify-between gap-3 p-3 hover:bg-white/[0.03] transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-white group-hover:text-violet-300 transition-colors truncate">{project.name}</p>
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
                        <div className="hidden md:flex items-center gap-2 w-36 shrink-0">
                          <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-violet-600 to-indigo-400 rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500 tabular-nums">{done}/{total}</span>
                        </div>
                      )}

                      <div className="text-right shrink-0">
                        <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded ${PROJECT_STATUS_COLORS[project.status] ?? "bg-white/10 text-zinc-300"}`}>
                          {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                        </span>
                        <p className={`text-[9px] font-mono mt-0.5 ${overdue ? "text-red-400 font-bold" : "text-zinc-500"}`}>
                          {project.estimatedDelivery ? formatDate(project.estimatedDelivery) : "Sans date"}
                          {overdue ? " (Retard)" : ""}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right (1/3 width) - Fast Create Form */}
        <div className="flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden justify-between space-y-4">
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            <div className="flex items-center gap-1.5">
              <SparklesIcon className="w-4 h-4 text-violet-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                Lancer un Projet Client
              </h2>
            </div>

            <form action={createProjectWithClient} className="space-y-3">
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
              <button type="submit" className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white transition-all cursor-pointer shadow-lg shadow-violet-600/20">
                Créer et envoyer l&apos;accès
              </button>
            </form>
          </div>

          <div className="p-3 rounded-lg border border-white/5 bg-black/40 text-[10px] text-zinc-500 font-mono">
            Camille Dubuisson (Chief Production AI)
          </div>
        </div>
      </div>
    </div>
  )
}
