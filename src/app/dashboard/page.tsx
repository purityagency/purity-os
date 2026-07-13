import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

import { ProjectChat } from "@/components/ProjectChat"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect("/login")
  }

  const userId = (session.user as any).id as string

  const project = await prisma.project.findFirst({
    where: { clientId: userId },
    include: {
      stages: { orderBy: { orderIndex: 'asc' } },
      messages: { orderBy: { createdAt: 'asc' }, include: { author: true } }
    }
  })

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Bonjour, {session.user.name || "Client"}</h1>
      
      {!project ? (
        <div className="p-8 border border-white/10 bg-white/5 rounded-2xl backdrop-blur-sm text-center">
          <p className="text-zinc-400">Aucun projet actif pour le moment.</p>
          <p className="text-sm text-zinc-500 mt-2">Votre équipe Purity prépare actuellement votre espace de travail.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="p-6 border border-white/10 bg-white/5 rounded-2xl backdrop-blur-sm">
              <h2 className="text-xl font-bold text-[#7C3AED] mb-2">{project.name}</h2>
              <div className="flex items-center text-sm text-zinc-400 gap-4">
                <span>Statut: {project.status}</span>
                {project.estimatedDelivery && (
                  <span>Livraison estimée: {new Date(project.estimatedDelivery).toLocaleDateString('fr-FR')}</span>
                )}
              </div>
            </div>

            <div className="p-6 border border-white/10 bg-white/5 rounded-2xl backdrop-blur-sm">
              <h3 className="font-bold mb-4">Progression (Étapes)</h3>
              <div className="space-y-4">
                {project.stages.map(stage => (
                  <div key={stage.id} className="flex justify-between items-center p-3 rounded-lg bg-black/20 border border-white/5">
                    <div>
                      <div className="font-medium">{stage.title}</div>
                      {stage.description && <div className="text-xs text-zinc-500">{stage.description}</div>}
                    </div>
                    <div className="text-xs px-2 py-1 rounded bg-[#7C3AED]/20 text-[#7C3AED]">
                      {stage.status}
                    </div>
                  </div>
                ))}
                {project.stages.length === 0 && (
                  <p className="text-sm text-zinc-500">Les étapes de votre projet vont bientôt apparaître ici.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="p-6 border border-white/10 bg-white/5 rounded-2xl backdrop-blur-sm">
              <h3 className="font-bold mb-4 text-[#7C3AED]">Discussion</h3>
              <ProjectChat messages={project.messages} projectId={project.id} currentUserId={userId} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
