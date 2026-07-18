import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

import { ProjectChat } from "@/components/ProjectChat"

// Status color helper for project phases
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

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect("/login")
  }

  const project = await prisma.project.findFirst({
    where: { clientId: session.user.id },
    include: {
      stages: { orderBy: { orderIndex: 'asc' } },
      messages: { orderBy: { createdAt: 'asc' }, include: { author: true } },
      documents: { orderBy: { uploadedAt: 'desc' } },
      payments: { orderBy: { createdAt: 'desc' } }
    }
  })

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Greeting */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Bonjour, {session.user.name || "Client"}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Bienvenue sur votre portail opérationnel Purity ONE.</p>
        </div>
        <div className="text-xs px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02] text-zinc-400">
          Système Purity OS v1.4.2
        </div>
      </div>
      
      {!project ? (
        <div className="p-12 border border-white/5 bg-[#060309]/50 rounded-2xl backdrop-blur-md text-center max-w-xl mx-auto mt-12">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#7C3AED]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Espace de travail en cours de déploiement</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Votre chef de projet Purity prépare actuellement votre espace de travail. Vous recevrez une notification par email dès l'activation de votre timeline.
          </p>
        </div>
      ) : (
        /* Bento Grid Layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Column (2/3 width on large screens) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Project Overview Card */}
            <div className="p-6 rounded-2xl glass-panel relative overflow-hidden transition-all duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#7C3AED]/5 blur-[80px] pointer-events-none rounded-full" />
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Projet en cours</span>
                  <h2 className="text-2xl font-bold text-white mt-1 mb-3">{project.name}</h2>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-400">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_#A855F7]" />
                      Secteur: <strong className="text-white">{project.sector || "Digital"}</strong>
                    </span>
                    {project.estimatedDelivery && (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
                        </svg>
                        Livraison estimée: <strong className="text-white">{new Date(project.estimatedDelivery).toLocaleDateString('fr-FR')}</strong>
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/10 text-xs font-bold text-purple-400 tracking-wider">
                  {project.status}
                </div>
              </div>
            </div>

            {/* Stages / Vertical Project Timeline */}
            <div className="p-6 rounded-2xl glass-panel transition-all duration-300">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-white text-lg">Timeline Opérationnelle</h3>
                  <p className="text-zinc-500 text-xs mt-0.5">Avancement en temps réel par phase de projet.</p>
                </div>
                <div className="text-xs text-zinc-400 font-medium">
                  {project.stages.filter(s => s.status === 'COMPLETED').length} / {project.stages.length} Terminé(s)
                </div>
              </div>
              
              <div className="relative pl-6 border-l border-white/5 space-y-6">
                {project.stages.map((stage, idx) => {
                  const styles = getStatusStyles(stage.status)
                  return (
                    <div key={stage.id} className="relative group">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[30px] top-1.5 w-4.5 h-4.5 rounded-full border border-[#060309] flex items-center justify-center bg-[#060309]`}>
                        <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
                      </span>
                      
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all duration-200">
                        <div>
                          <h4 className="font-semibold text-sm text-white">{stage.title}</h4>
                          {stage.description && (
                            <p className="text-xs text-zinc-500 mt-1 leading-relaxed max-w-xl">{stage.description}</p>
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

            {/* Financial Overview & Payments Widget */}
            <div className="p-6 rounded-2xl glass-panel transition-all duration-300">
              <div>
                <h3 className="font-bold text-white text-lg">Facturation & Suivi Financier</h3>
                <p className="text-zinc-500 text-xs mt-0.5">Récapitulatif des flux budgétaires de la commande.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Prix Total</span>
                  <span className="block text-lg font-bold text-white mt-1">{(project.totalPrice || 0).toLocaleString('fr-BE')} €</span>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Acompte Payé</span>
                  <span className="block text-lg font-bold text-emerald-400 mt-1">{(project.depositAmount || 0).toLocaleString('fr-BE')} €</span>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Solde Restant</span>
                  <span className="block text-lg font-bold text-purple-400 mt-1">{(project.remainingAmount || 0).toLocaleString('fr-BE')} €</span>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Suivi Mensuel</span>
                  <span className="block text-lg font-bold text-zinc-200 mt-1">{(project.monthlyAmount || 0) > 0 ? `${project.monthlyAmount} €/m` : "Aucun"}</span>
                </div>
              </div>

              {/* Progress Bar of Payments */}
              {project.totalPrice && (
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-zinc-400">
                    <span>Avancement de paiement</span>
                    <span>{Math.round(((project.depositAmount || 0) / project.totalPrice) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full" 
                      style={{ width: `${((project.depositAmount || 0) / project.totalPrice) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Document Shared Files Widget */}
            <div className="p-6 rounded-2xl glass-panel transition-all duration-300">
              <div className="mb-6">
                <h3 className="font-bold text-white text-lg">Documents & Livrables</h3>
                <p className="text-zinc-500 text-xs mt-0.5">Accédez à vos maquettes, briefs et factures d'acompte.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.documents.map(doc => (
                  <a 
                    key={doc.id}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-purple-500/20 transition-all duration-300 group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 group-hover:bg-[#7C3AED]/10 group-hover:text-[#C084FC] transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-white truncate group-hover:text-purple-400 transition-colors">{doc.filename}</h4>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mt-0.5">
                        {doc.type} • {(doc.filesize / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 group-hover:bg-white/10 group-hover:text-white transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
                      </svg>
                    </div>
                  </a>
                ))}

                {project.documents.length === 0 && (
                  <div className="md:col-span-2 py-8 text-center border border-dashed border-white/5 rounded-xl bg-white/[0.005]">
                    <svg className="w-8 h-8 text-zinc-600 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M9 13h6m-3-3v6m-9 1V4a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    </svg>
                    <p className="text-zinc-500 text-xs">Aucun document n'a encore été mis à disposition.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column (Discussion Widget, 1/3 width on large screens) */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl glass-panel transition-all duration-300 relative h-full flex flex-col min-h-[500px]">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#7C3AED]/3 blur-[60px] pointer-events-none rounded-full" />
              
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-lg">Discussion</h3>
                  <p className="text-zinc-500 text-xs mt-0.5">Messagerie directe avec l'équipe technique.</p>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]" title="En ligne" />
              </div>

              {/* Chat Component */}
              <div className="flex-1 flex flex-col min-h-0">
                <ProjectChat messages={project.messages} projectId={project.id} currentUserId={session.user.id} />
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
