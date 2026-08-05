import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { KanbanIcon, SparklesIcon } from "@/components/icons"
import Link from "next/link"
import { formatDate } from "@/lib/adminFormat"

export default async function AdminProductionPage() {
  await requireAdminSession()

  // Fetch active projects and their stages
  const activeProjects = await prisma.project.findMany({
    where: { status: "ACTIVE" },
    include: {
      stages: { orderBy: { orderIndex: "asc" } },
      client: { select: { name: true } }
    },
    orderBy: { updatedAt: "desc" },
    take: 10
  })

  // Mocked CI/CD and velocity metrics for now
  const activeDeployments = 0
  const qaPassRate = 100
  const avgVelocity = "14 jours"

  return (
    <div className="h-[calc(100vh-90px)] flex flex-col space-y-4 overflow-hidden">
      {/* Header Compact */}
      <div className="shrink-0 space-y-3 border-b border-white/5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Production Digitale · Pôle 04</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
              <KanbanIcon className="w-6 h-6 text-blue-400" />
              <span>Pipeline de Livraison & DevOps</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors shrink-0">
              Lancer Build Forcé
            </button>
          </div>
        </div>

        {/* KPI Ribbon Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Projets en Dev</span>
            <span className="text-base font-bold text-blue-400 tabular-nums">{activeProjects.length}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Déploiements Actifs</span>
            <span className="text-base font-bold text-white tabular-nums">{activeDeployments}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">QA Pass Rate</span>
            <span className="text-base font-bold text-emerald-400 tabular-nums">{qaPassRate}%</span>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Vélocité Moyenne</span>
            <span className="text-base font-bold text-white tabular-nums">{avgVelocity}</span>
          </div>
        </div>
      </div>

      {/* Main Fit-To-Screen Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 overflow-hidden">
        {/* Left (2/3 width) - Development Pipeline */}
        <div className="lg:col-span-2 flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <KanbanIcon className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white">Projets en Cours</h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">{activeProjects.length} projets</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {activeProjects.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
                <KanbanIcon className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400">Aucun projet en développement.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeProjects.map((project) => {
                  const currentStage = project.stages.find(s => s.status === "IN_PROGRESS" || s.status === "WAITING_CLIENT" || s.status === "REVIEW")
                  return (
                    <Link
                      key={project.id}
                      href={`/admin/projects/${project.id}`}
                      className="block p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-sm font-bold text-white">{project.name}</h3>
                          <p className="text-[10px] text-zinc-500 font-mono">Client: {project.client.name} · Modifié le {formatDate(project.updatedAt)}</p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {currentStage ? currentStage.title : "En attente"}
                        </span>
                      </div>
                      <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full" 
                          style={{ width: `${project.stages.length > 0 ? (project.stages.filter(s => s.status === "COMPLETED").length / project.stages.length) * 100 : 0}%` }}
                        />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right (1/3 width) - CI/CD & DevOps */}
        <div className="flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden justify-between space-y-4">
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <SparklesIcon className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                  Logs de Déploiement
                </h2>
              </div>
            </div>

            <div className="p-4 border border-dashed border-white/5 rounded-xl bg-black/20 text-center">
              <p className="text-[11px] text-zinc-500 font-mono">Aucun déploiement récent (En attente d&apos;intégration Vercel).</p>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-white/5 bg-black/40 text-[10px] text-zinc-500 font-mono">
            Lead Developer (DevOps AI)
          </div>
        </div>
      </div>
    </div>
  )
}
