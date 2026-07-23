import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

const getStatusStyles = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return { bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", dot: "bg-emerald-400 shadow-[0_0_10px_#10B981]" }
    case "IN_PROGRESS":
      return { bg: "bg-purple-500/10 border-purple-500/20 text-purple-400", dot: "bg-purple-400 shadow-[0_0_10px_#A855F7]" }
    case "WAITING_CLIENT":
      return { bg: "bg-amber-500/10 border-amber-500/20 text-amber-400", dot: "bg-amber-400 shadow-[0_0_10px_#F59E0B]" }
    case "BLOCKED":
      return { bg: "bg-rose-500/10 border-rose-500/20 text-rose-400", dot: "bg-rose-400 shadow-[0_0_10px_#F43F5E]" }
    default:
      return { bg: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400", dot: "bg-zinc-500" }
  }
}

export default async function TimelinePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const project = await prisma.project.findFirst({
    where: { clientId: session.user.id },
    include: {
      stages: { orderBy: { orderIndex: "asc" } }
    }
  })

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          Timeline Opérationnelle
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Suivi en temps réel des jalons et de la livraison de votre projet.</p>
      </div>

      {!project ? (
        <div className="p-8 border border-white/5 bg-[#060309]/50 rounded-2xl text-center">
          <p className="text-zinc-500 text-sm">Aucun projet actif rattaché à ce compte.</p>
        </div>
      ) : (
        <div className="p-6 rounded-2xl glass-panel space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-white/5">
            <div>
              <h2 className="font-bold text-white text-lg">{project.name}</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Secteur: {project.sector || "Digital"}</p>
            </div>
            <div className="text-xs font-semibold px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-400">
              {project.stages.filter(s => s.status === 'COMPLETED').length} / {project.stages.length} étapes validées
            </div>
          </div>

          <div className="relative pl-6 border-l border-white/5 space-y-6">
            {project.stages.map((stage) => {
              const styles = getStatusStyles(stage.status)
              return (
                <div key={stage.id} className="relative group">
                  <span className="absolute -left-[30px] top-1.5 w-4.5 h-4.5 rounded-full border border-[#060309] flex items-center justify-center bg-[#060309]">
                    <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
                  </span>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                    <div>
                      <h3 className="font-semibold text-sm text-white">{stage.title}</h3>
                      {stage.description && (
                        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{stage.description}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border self-start md:self-auto ${styles.bg}`}>
                      {stage.status}
                    </span>
                  </div>
                </div>
              )
            })}
            {project.stages.length === 0 && (
              <p className="text-sm text-zinc-500 italic py-4">Les étapes de votre projet vont bientôt apparaître ici.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
