import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import Link from "next/link"
import {
  formatEUR,
  formatDate,
  formatDateTime,
  STAGE_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
} from "@/lib/adminFormat"
import { POLES } from "@/lib/agentRoster"
import { DashboardTabs } from "./DashboardTabs"

export default async function AdminDashboard() {
  await requireAdminSession()

  const now = new Date()

  const [
    totalProjects,
    activeProjects,
    totalClients,
    paidAgg,
    pendingAgg,
    activeMonthlyProjects,
    overdueProjects,
    newEventsCount,
    recentEvents,
    blockedStages,
    waitingStages,
    inactiveClients,
    aiEventsCount,
    systemEventsCount,
    recentAiSystemEvents,
    agentActivities,
    pendingDraftsCount,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: "PENDING" }, _sum: { amount: true } }),
    prisma.project.findMany({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] }, monthlyAmount: { not: null } },
      select: { monthlyAmount: true },
    }),
    prisma.project.findMany({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] }, estimatedDelivery: { lt: now } },
      orderBy: { estimatedDelivery: "asc" },
      take: 5,
      include: { client: { select: { name: true, email: true } } },
    }),
    prisma.event.count({ where: { status: "NEW" } }),
    prisma.event.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.stage.findMany({
      where: { status: "BLOCKED", project: { status: { notIn: ["COMPLETED", "CANCELLED"] } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.stage.findMany({
      where: { status: "WAITING_CLIENT", project: { status: { notIn: ["COMPLETED", "CANCELLED"] } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.user.count({ where: { role: "CLIENT", passwordHash: null } }),
    prisma.event.count({ where: { type: "AI" } }),
    prisma.event.count({ where: { type: "SYSTEM" } }),
    prisma.event.findMany({
      where: { type: { in: ["AI", "SYSTEM"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.agentActivity.findMany({ select: { department: true, updatedAt: true } }),
    prisma.emailDraft.count({ where: { status: "PENDING_APPROVAL" } }),
  ])

  const RECENT_MS = 24 * 60 * 60 * 1000
  const activeDepartments = new Set(
    agentActivities
      .filter((a) => now.getTime() - new Date(a.updatedAt).getTime() < RECENT_MS)
      .map((a) => a.department)
  )

  const totalPaid = paidAgg._sum.amount ?? 0
  const totalPending = pendingAgg._sum.amount ?? 0
  const monthlyRecurring = activeMonthlyProjects.reduce(
    (sum: number, p: { monthlyAmount: number | null }) => sum + (p.monthlyAmount ?? 0),
    0,
  )

  const actionItems = [
    ...blockedStages.map((s) => ({
      id: `blocked-${s.id}`,
      href: `/admin/projects/${s.project.id}`,
      label: s.title,
      context: `Projet: ${s.project.name}`,
      badge: STAGE_STATUS_LABELS.BLOCKED,
      tone: "critical" as const,
      icon: "🚫",
    })),
    ...overdueProjects.map((p) => ({
      id: `overdue-${p.id}`,
      href: `/admin/projects/${p.id}`,
      label: p.name,
      context: `Client: ${p.client.name ?? p.client.email}`,
      badge: `Échéance dépassée (${p.estimatedDelivery ? formatDate(p.estimatedDelivery) : ""})`.trim(),
      tone: "critical" as const,
      icon: "⏰",
    })),
    ...waitingStages.map((s) => ({
      id: `waiting-${s.id}`,
      href: `/admin/projects/${s.project.id}`,
      label: s.title,
      context: `Projet: ${s.project.name}`,
      badge: STAGE_STATUS_LABELS.WAITING_CLIENT,
      tone: "warning" as const,
      icon: "⌛",
    })),
  ]

  const formattedEvents = recentEvents.map(e => ({
    id: e.id,
    name: e.name || e.email || "Contact anonyme",
    summary: e.summary || EVENT_TYPE_LABELS[e.type] || e.type,
    type: e.type,
    typeLabel: EVENT_TYPE_LABELS[e.type] ?? e.type,
    typeColor: EVENT_TYPE_COLORS[e.type] ?? "bg-white/10 text-zinc-300",
    time: formatDateTime(e.createdAt),
    href: e.projectId ? `/admin/projects/${e.projectId}` : "/admin/inbox",
  }))

  const formattedAiEvents = recentAiSystemEvents.map(e => ({
    id: e.id,
    summary: e.summary || "Activité système",
    name: e.name || "Purity Kernel",
    type: e.type,
    typeLabel: EVENT_TYPE_LABELS[e.type] ?? e.type,
    typeColor: EVENT_TYPE_COLORS[e.type] ?? "bg-white/10 text-zinc-300",
    time: formatDateTime(e.createdAt),
    href: "/admin/inbox?type=AI",
  }))

  return (
    <div className="space-y-5">
      {/* Header compact avec toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Purity OS · Executive Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">Vue d&apos;ensemble</h1>
        </div>

        {/* Action quick links */}
        <div className="flex items-center gap-2">
          <Link
            href="/admin/acquisition"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-all flex items-center gap-1.5 shadow-md shadow-violet-600/20"
          >
            <span>🎯 Acquisition</span>
            {pendingDraftsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black text-[10px] font-bold font-mono">
                {pendingDraftsCount}
              </span>
            )}
          </Link>
          <Link
            href="/admin/inbox"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 transition-colors flex items-center gap-1.5"
          >
            <span>📥 Inbox</span>
            {newEventsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-violet-500 text-white text-[10px] font-bold font-mono">
                {newEventsCount}
              </span>
            )}
          </Link>
          <Link
            href="/admin/clients"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 transition-colors"
          >
            + Client
          </Link>
        </div>
      </div>

      {/* Ribbon KPI Compact (4 cartes principales) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-md">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block truncate">Demandes Entrantes</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-violet-400 tabular-nums">{newEventsCount}</span>
            <span className="text-[10px] text-zinc-500 font-mono">Formulaires & RDV</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-md">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block truncate">Projets Actifs</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-white tabular-nums">{activeProjects}</span>
            <span className="text-[10px] text-zinc-500 font-mono">sur {totalProjects} total</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block truncate">Total Encaissé</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-emerald-400 tabular-nums">{formatEUR(totalPaid)}</span>
            <span className="text-[10px] text-emerald-500 font-mono">Confirmé</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block truncate">À Encaisser</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-amber-400 tabular-nums">{formatEUR(totalPending)}</span>
            <span className="text-[10px] text-amber-500 font-mono">En attente</span>
          </div>
        </div>
      </div>

      {/* Grille principale 2 Colonnes (2/3 Onglets d'action & 1/3 Matrice Pôles IA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Gauche : Console Onglets (Action Center / Inquiries / IA Stream) */}
        <div className="lg:col-span-2">
          <DashboardTabs
            actionItems={actionItems}
            recentEvents={formattedEvents}
            recentAiEvents={formattedAiEvents}
          />
        </div>

        {/* Droite : Matrice 6 Pôles IA */}
        <div className="space-y-4">
          <section className="border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">Écosystème 6 Pôles IA</h2>
              </div>
              <Link href="/admin/ecosystem" className="text-[10px] text-violet-400 hover:underline font-mono">
                Roster →
              </Link>
            </div>

            <div className="space-y-2">
              {POLES.map((pole) => {
                const isActive = activeDepartments.has(`${pole.id}_${pole.name.split(" ")[0].toUpperCase()}`) ||
                  [...activeDepartments].some((d) => d.startsWith(`${pole.id}_`))
                const hasCode = pole.chief.coded || pole.agents.some((a) => a.coded)
                const statusColor = isActive ? "text-emerald-400" : hasCode ? "text-amber-400" : "text-zinc-600"
                const codedCount = pole.agents.filter((a) => a.coded).length + (pole.chief.coded ? 1 : 0)

                return (
                  <div
                    key={pole.id}
                    className="p-2.5 rounded-lg border border-white/5 bg-black/20 flex items-center justify-between text-xs hover:border-white/10 transition-colors"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-white shrink-0">
                        P{pole.id}
                      </span>
                      <div className="truncate">
                        <p className="font-semibold text-white truncate text-xs">{pole.name}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{pole.chief.fullName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-mono text-zinc-500">{codedCount} agent(s)</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : hasCode ? 'bg-amber-400' : 'bg-zinc-700'}`} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Quick Stats Summary Box */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.01] space-y-2 text-xs text-zinc-400">
            <div className="flex items-center justify-between">
              <span>Clients au total</span>
              <span className="font-bold text-white font-mono">{totalClients}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Abonnements Récurrents (MRR)</span>
              <span className="font-bold text-violet-400 font-mono">{formatEUR(monthlyRecurring)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Accès Clients non-activés</span>
              <span className="font-bold text-amber-400 font-mono">{inactiveClients}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
