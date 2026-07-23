import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"

import { ProjectChat } from "@/components/ProjectChat"

// Status color helper for project phases
const getStatusStyles = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return { bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", dot: "bg-emerald-400 shadow-[0_0_10px_#10B981]", label: "Terminé" }
    case "IN_PROGRESS":
      return { bg: "bg-purple-500/10 border-purple-500/20 text-purple-400", dot: "bg-purple-400 shadow-[0_0_10px_#A855F7]", label: "En cours" }
    case "WAITING_CLIENT":
      return { bg: "bg-amber-500/10 border-amber-500/20 text-amber-400", dot: "bg-amber-400 shadow-[0_0_10px_#F59E0B]", label: "Action requise" }
    case "BLOCKED":
      return { bg: "bg-rose-500/10 border-rose-500/20 text-rose-400", dot: "bg-rose-400 shadow-[0_0_10px_#F43F5E]", label: "En pause" }
    default:
      return { bg: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400", dot: "bg-zinc-500", label: "En attente" }
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

  const completedStages = project ? project.stages.filter(s => s.status === 'COMPLETED').length : 0
  const totalStages = project ? project.stages.length : 0
  const progressPercent = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0
  const waitingStage = project?.stages.find(s => s.status === 'WAITING_CLIENT')

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Bonjour, {session.user.name || "Client"} 👋
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Espace de suivi opérationnel en temps réel de votre projet.</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://wa.me/32465368265"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Support WhatsApp Agence
          </a>
          <div className="text-xs px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02] text-zinc-500">
            Purity OS v1.5.0
          </div>
        </div>
      </div>

      {!project ? (
        <div className="p-12 border border-white/5 bg-[#060309]/50 rounded-2xl backdrop-blur-md text-center max-w-xl mx-auto mt-12 space-y-4">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-[#7C3AED]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">Espace de travail en cours de préparation</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Votre chef de projet Purity prépare actuellement votre espace de travail. Vous recevrez un accès direct dès la création de votre première timeline.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Action Required Alert Banner */}
          {waitingStage && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" x2="12" y1="9" y2="13" />
                    <line x1="12" x2="12.01" y1="17" y2="17" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-amber-300 text-sm">Action requise de votre part</h4>
                  <p className="text-xs text-amber-200/80 mt-0.5">{waitingStage.title} — {waitingStage.description || "Votre validation est attendue."}</p>
                </div>
              </div>
              <Link
                href="/dashboard/messages"
                className="px-4 py-2 rounded-xl bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition-all shrink-0"
              >
                Répondre à l&apos;équipe
              </Link>
            </div>
          )}

          {/* Staging Live Preview Banner */}
          <div className="p-6 rounded-2xl glass-panel relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-purple-500/20 bg-gradient-to-r from-purple-950/30 via-[#060309] to-black">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                Environnement Staging Live Synchro
              </div>
              <h2 className="text-2xl font-bold text-white">{project.name}</h2>
              <p className="text-xs text-zinc-400">Prévisualisez l&apos;état d&apos;avancement exact de votre site et vos fonctionnalités en direct.</p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <a
                href="http://localhost:3000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition-all active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" x2="21" y1="14" y2="3" />
                </svg>
                Ouvrir la Prévisualisation Staging
              </a>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/dashboard/timeline"
              className="p-4 rounded-xl glass-panel border border-white/5 hover:border-purple-500/20 hover:bg-white/[0.02] transition-all group"
            >
              <div className="flex items-center justify-between text-zinc-400 group-hover:text-purple-400 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="text-[10px] font-bold text-purple-400">{progressPercent}%</span>
              </div>
              <div className="font-semibold text-xs text-white">Timeline Projet</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">{completedStages}/{totalStages} étapes validées</div>
            </Link>

            <Link
              href="/dashboard/documents"
              className="p-4 rounded-xl glass-panel border border-white/5 hover:border-purple-500/20 hover:bg-white/[0.02] transition-all group"
            >
              <div className="flex items-center justify-between text-zinc-400 group-hover:text-purple-400 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" />
                </svg>
                <span className="text-[10px] font-bold text-zinc-400">{project.documents.length}</span>
              </div>
              <div className="font-semibold text-xs text-white">Fichiers & Briefs</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Télécharger / Envoyer</div>
            </Link>

            <Link
              href="/dashboard/messages"
              className="p-4 rounded-xl glass-panel border border-white/5 hover:border-purple-500/20 hover:bg-white/[0.02] transition-all group"
            >
              <div className="flex items-center justify-between text-zinc-400 group-hover:text-purple-400 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-[10px] font-bold text-emerald-400">Direct</span>
              </div>
              <div className="font-semibold text-xs text-white">Discussion Client</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">{project.messages.length} message(s)</div>
            </Link>

            <Link
              href="/dashboard/payments"
              className="p-4 rounded-xl glass-panel border border-white/5 hover:border-purple-500/20 hover:bg-white/[0.02] transition-all group"
            >
              <div className="flex items-center justify-between text-zinc-400 group-hover:text-purple-400 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
                </svg>
                <span className="text-[10px] font-bold text-emerald-400">{(project.depositAmount || 0).toLocaleString("fr-BE")} €</span>
              </div>
              <div className="font-semibold text-xs text-white">Facturation & Reglement</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Acompte & Solde</div>
            </Link>
          </div>

          {/* Main Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Stages / Vertical Project Timeline */}
              <div className="p-6 rounded-2xl glass-panel transition-all duration-300">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-white text-lg">Timeline Opérationnelle</h3>
                    <p className="text-zinc-500 text-xs mt-0.5">Avancement en temps réel par phase de projet.</p>
                  </div>
                  <div className="text-xs text-zinc-400 font-medium">
                    {completedStages} / {totalStages} Terminé(s) ({progressPercent}%)
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-6">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                
                <div className="relative pl-6 border-l border-white/5 space-y-6">
                  {project.stages.map((stage) => {
                    const styles = getStatusStyles(stage.status)
                    return (
                      <div key={stage.id} className="relative group">
                        <span className="absolute -left-[30px] top-1.5 w-4.5 h-4.5 rounded-full border border-[#060309] flex items-center justify-center bg-[#060309]">
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
                            {styles.label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Financial Overview Card */}
              <div className="p-6 rounded-2xl glass-panel transition-all duration-300">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-white text-lg">Facturation & Budget</h3>
                    <p className="text-zinc-500 text-xs mt-0.5">Récapitulatif des règlements et reste à payer.</p>
                  </div>
                  <Link href="/dashboard/payments" className="text-xs text-purple-400 font-semibold hover:underline">
                    Voir détails →
                  </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              </div>

            </div>

            {/* Right Column (Live Chat Widget, 1/3 width) */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl glass-panel relative flex flex-col h-full min-h-[520px]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-lg">Support Client</h3>
                    <p className="text-zinc-500 text-xs mt-0.5">Canal direct avec votre équipe Purity.</p>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]" title="En ligne" />
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <ProjectChat messages={project.messages} projectId={project.id} currentUserId={session.user.id} />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
