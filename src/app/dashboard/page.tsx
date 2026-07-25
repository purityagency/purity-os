import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Stage } from "@prisma/client"

// Simplification des termes techniques pour les indépendants & PME
const getStatusStyles = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return { bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", dot: "bg-emerald-400 shadow-[0_0_10px_#10B981]", label: "Terminé & Validé" }
    case "IN_PROGRESS":
      return { bg: "bg-purple-500/10 border-purple-500/20 text-purple-400", dot: "bg-purple-400 shadow-[0_0_10px_#A855F7]", label: "En création" }
    case "WAITING_CLIENT":
      return { bg: "bg-amber-500/10 border-amber-500/20 text-amber-400", dot: "bg-amber-400 shadow-[0_0_10px_#F59E0B]", label: "Vos infos attendues" }
    case "BLOCKED":
      return { bg: "bg-rose-500/10 border-rose-500/20 text-rose-400", dot: "bg-rose-400 shadow-[0_0_10px_#F43F5E]", label: "En attente" }
    case "REVIEW":
      return { bg: "bg-sky-500/10 border-sky-500/20 text-sky-400", dot: "bg-sky-400 shadow-[0_0_10px_#38BDF8]", label: "En relecture" }
    default:
      return { bg: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400", dot: "bg-zinc-500", label: "Prochaine étape" }
  }
}

// Avancement approximatif déduit du statut réel de l'étape — pas de chiffre inventé,
// juste une lecture visuelle cohérente du même statut affiché en toutes lettres à côté.
const STATUS_PROGRESS: Record<string, number> = {
  PENDING: 0,
  IN_PROGRESS: 55,
  WAITING_CLIENT: 55,
  BLOCKED: 35,
  REVIEW: 85,
  COMPLETED: 100,
}

const SECTOR_LABELS: Record<string, string> = {
  coiffure: "Coiffure & Beauté",
  artisan: "Artisan & Bâtiment",
  horeca: "HoReCa & Restauration",
  praticien: "Praticien & Bien-être",
  immobilier: "Immobilier",
  avocat: "Avocats & Juridique",
  commerce: "Commerces & Retail",
  fitness: "Sport & Fitness",
  consulting: "Consulting & B2B",
  formation: "Centres de Formation",
  garage: "Garages & Auto",
  finance: "Experts-Comptables",
  photo: "Photographes & Vidéastes",
  veterinaire: "Santé Animale",
  architecte: "Architectes & Déco",
  domicile: "Services à la Personne",
}

function ProgressRing({ percent, size = 120 }: { percent: number; size?: number }) {
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-white/5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-[#7C3AED] transition-all duration-700"
      />
    </svg>
  )
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
      documents: { orderBy: { uploadedAt: 'desc' } },
      payments: { orderBy: { createdAt: 'desc' } }
    }
  })

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto pb-12">
        <div className="p-12 border border-white/5 bg-[#060309]/50 rounded-2xl backdrop-blur-md text-center max-w-xl mx-auto mt-12 space-y-4">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-[#7C3AED]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">Votre dossier est en cours de création</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Votre conseiller Purity prépare actuellement votre espace. Vous pourrez suivre l&apos;avancement étape par étape dès l&apos;activation.
          </p>
        </div>
      </div>
    )
  }

  const completedStages = project.stages.filter((s: Stage) => s.status === 'COMPLETED').length
  const totalStages = project.stages.length
  const progressPercent = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0
  const waitingStage = project.stages.find((s: Stage) => s.status === 'WAITING_CLIENT')

  const activeStages = project.stages.filter((s: Stage) => s.status !== 'COMPLETED' && s.status !== 'PENDING')
  const nextStage = project.stages.find((s: Stage) => s.status !== 'COMPLETED')

  const sectorLabel = (project.sector && SECTOR_LABELS[project.sector]) || project.sector || "Présence & Automatisation"
  const deliveryLabel = project.estimatedDelivery
    ? new Date(project.estimatedDelivery).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })
    : "À définir"

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Bonjour {session.user.name || "et bienvenue"} 👋</p>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">{project.name}</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {project.status === 'COMPLETED' ? 'Projet terminé' : 'Projet en cours'} · {sectorLabel}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard/messages"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Nouveau message
          </Link>
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            title="Voir mon site en direct"
            className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" x2="21" y1="14" y2="3" />
            </svg>
          </a>
        </div>
      </div>

      {/* Action Required Alert Banner */}
      {waitingStage && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
              <p className="text-xs text-amber-200/90 mt-0.5">{waitingStage.title} — {waitingStage.description || "Nous avons besoin de vos éléments pour continuer."}</p>
            </div>
          </div>
          <Link
            href="/dashboard/messages"
            className="px-4 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-all shrink-0"
          >
            Répondre directement
          </Link>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl glass-panel flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-zinc-300 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Livrables en cours</p>
            <p className="text-2xl font-bold text-white leading-tight">{activeStages.length}</p>
            <p className="text-[11px] text-zinc-500">En cours de création</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Livrables terminés</p>
            <p className="text-2xl font-bold text-white leading-tight">{completedStages}</p>
            <p className="text-[11px] text-zinc-500">Terminés</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center text-[#C084FC] shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Livraison estimée</p>
            <p className="text-lg font-bold text-white leading-tight">{deliveryLabel}</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Livrables en cours */}
          <div className="p-6 rounded-2xl glass-panel">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-white text-lg">Livrables en cours</h3>
              <Link href="/dashboard/timeline" className="text-xs text-purple-400 font-semibold hover:underline">
                Voir tout →
              </Link>
            </div>

            {activeStages.length === 0 ? (
              <p className="text-sm text-zinc-500 py-6 text-center">Tout est à jour, rien en attente de votre côté.</p>
            ) : (
              <div className="space-y-4">
                {activeStages.map((stage: Stage) => {
                  const styles = getStatusStyles(stage.status)
                  const percent = STATUS_PROGRESS[stage.status] ?? 0
                  return (
                    <div key={stage.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${styles.dot}`} />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-white truncate">{stage.title}</p>
                            <p className="text-[11px] text-zinc-500">{styles.label}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-[#C084FC] shrink-0">{percent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Financial Overview Card */}
          <div className="p-6 rounded-2xl glass-panel">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-white text-lg">Synthèse Financière</h3>
                <p className="text-zinc-500 text-xs mt-0.5">Votre acompte, solde restant et abonnement en toute transparence.</p>
              </div>
              <Link href="/dashboard/payments" className="text-xs text-purple-400 font-semibold hover:underline">
                Détail des factures →
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
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Abonnement Mensuel</span>
                <span className="block text-lg font-bold text-zinc-200 mt-1">{(project.monthlyAmount || 0) > 0 ? `${project.monthlyAmount} €/mois` : "Aucun"}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">

          {/* Prochain livrable */}
          <div className="p-6 rounded-2xl glass-panel">
            <h3 className="font-bold text-white text-base mb-4">Prochain livrable</h3>
            {nextStage ? (
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center text-[#C084FC] shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-white truncate">{nextStage.title}</p>
                  <p className="text-[11px] text-zinc-500">
                    Mis à jour le {new Date(nextStage.updatedAt).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Toutes les étapes sont terminées 🎉</p>
            )}
          </div>

          {/* Statut du projet */}
          <div className="p-6 rounded-2xl glass-panel">
            <h3 className="font-bold text-white text-base mb-5">Statut du projet</h3>
            <div className="flex items-center gap-6">
              <div className="relative shrink-0">
                <ProgressRing percent={progressPercent} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">{progressPercent}%</span>
                </div>
              </div>
              <ul className="space-y-2 min-w-0">
                {project.stages.map((stage: Stage) => (
                  <li key={stage.id} className="flex items-center gap-2 text-xs">
                    {stage.status === 'COMPLETED' ? (
                      <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-zinc-600 shrink-0" />
                    )}
                    <span className={stage.status === 'COMPLETED' ? 'text-zinc-300' : 'text-zinc-500'}>{stage.title}</span>
                  </li>
                ))}
                {project.stages.length === 0 && <li className="text-xs text-zinc-500">Les étapes vont bientôt apparaître ici.</li>}
              </ul>
            </div>
          </div>

          {/* WhatsApp Contact */}
          <a
            href="https://wa.me/32465368265"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15 transition-all group"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-400">Contacter par WhatsApp</p>
              <p className="text-[11px] text-emerald-200/70">Réponse rapide de l&apos;équipe</p>
            </div>
          </a>

        </div>

      </div>

      {/* Live Preview Banner */}
      <div className="p-6 rounded-2xl glass-panel relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-purple-500/20 bg-gradient-to-r from-purple-950/30 via-[#060309] to-black">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            Votre site est en cours de construction
          </div>
          <p className="text-xs text-zinc-400">Testez et visualisez votre site en direct comme le verront vos futurs clients.</p>
        </div>
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition-all active:scale-95 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" x2="21" y1="14" y2="3" />
          </svg>
          Voir mon site en direct
        </a>
      </div>
    </div>
  )
}
