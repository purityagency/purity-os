import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect("/login")
  }

  // Cast session.user to extract custom id added in callback
  const userId = (session.user as any).id as string

  // Fetch active project for user
  const project = await prisma.project.findFirst({
    where: { clientId: userId },
    include: {
      stages: {
        orderBy: { orderIndex: 'asc' }
      }
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
          {/* Main Info */}
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

            {/* Stages overview */}
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

          {/* Sidebar Widgets */}
          <div className="space-y-8">
            <div className="p-6 border border-[#7C3AED]/30 bg-[#7C3AED]/10 rounded-2xl backdrop-blur-sm text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="font-bold text-white mb-2">Besoin d'aide ?</h3>
              <p className="text-sm text-zinc-400 mb-4">L'équipe Purity est disponible pour répondre à vos questions.</p>
              <button className="w-full py-2 bg-white text-[#060309] font-bold rounded-lg hover:bg-zinc-200 transition-colors">
                Contacter l'équipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
