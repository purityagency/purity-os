import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

  const projects = await prisma.project.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { id: true, name: true, email: true } },
      stages: { select: { status: true } },
    },
  })

  const buildHref = (status?: string) => {
    const params = new URLSearchParams()
    if (status) params.set("status", status)
    if (query) params.set("q", query)
    const qs = params.toString()
    return qs ? `/admin/projects?${qs}` : "/admin/projects"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Projets</h1>
        <p className="mt-1 text-sm text-zinc-400">Tous les dossiers en cours et terminés.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <form method="get" className="flex gap-2">
            <label htmlFor="project-search" className="sr-only">Rechercher un projet</label>
            <input
              id="project-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Rechercher par projet ou client…"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/60"
            />
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            <button
              type="submit"
              className="rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors active:scale-[0.98]"
            >
              Chercher
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={buildHref()}
              aria-current={!statusFilter ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                !statusFilter ? "bg-[#7C3AED] text-white" : "border border-white/10 text-zinc-300 hover:bg-white/5"
              }`}
            >
              Tous
            </Link>
            {VALID_STATUSES.map((status) => (
              <Link
                key={status}
                href={buildHref(status)}
                aria-current={statusFilter === status ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === status ? "bg-[#7C3AED] text-white" : "border border-white/10 text-zinc-300 hover:bg-white/5"
                }`}
              >
                {PROJECT_STATUS_LABELS[status]}
              </Link>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            {projects.length === 0 ? (
              <p className="p-6 text-sm text-zinc-400">
                {query || statusFilter ? "Aucun projet ne correspond à ce filtre." : "Aucun projet enregistré."}
              </p>
            ) : (
              <div className="divide-y divide-white/10">
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
                      className="block p-5 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{project.name}</p>
                          <p className="text-xs text-zinc-400 truncate mt-0.5">
                            {project.client.name || project.client.email}
                            {sectorLabel(project.sector) ? ` · ${sectorLabel(project.sector)}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[11px] px-2 py-0.5 rounded inline-block ${PROJECT_STATUS_COLORS[project.status] ?? "bg-white/10 text-zinc-300"}`}>
                            {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                          </span>
                          <p className={`text-[11px] mt-1 ${overdue ? "text-red-400" : "text-zinc-500"}`}>
                            {project.estimatedDelivery ? formatDate(project.estimatedDelivery) : "Pas de date"}
                            {overdue ? " · en retard" : ""}
                          </p>
                        </div>
                      </div>
                      {total > 0 && (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                          <span className="text-[11px] text-zinc-500 tabular-nums shrink-0">{done}/{total}</span>
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div>
          <Card className="bg-[#7C3AED]/10 border-[#7C3AED]/30 text-white backdrop-blur-md sticky top-8">
            <CardHeader>
              <CardTitle>Nouveau projet</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createProjectWithClient} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nom du client</Label>
                  <Input id="clientName" name="clientName" required maxLength={200} className="bg-white/5 border-white/10" placeholder="Ex : Marie Vandenbroucke" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">E-mail du client</Label>
                  <Input id="clientEmail" name="clientEmail" type="email" required className="bg-white/5 border-white/10" placeholder="marie@salon-eclat.be" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectName">Nom du projet</Label>
                  <Input id="projectName" name="projectName" required maxLength={200} className="bg-white/5 border-white/10" placeholder="Site vitrine + réservation" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedDelivery">Livraison estimée</Label>
                  <Input id="estimatedDelivery" name="estimatedDelivery" type="date" className="bg-white/5 border-white/10" />
                </div>
                <Button type="submit" className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white">
                  Créer le projet
                </Button>
                <p className="text-[11px] text-zinc-400">
                  Le client reçoit automatiquement son lien d&apos;accès à l&apos;espace.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
