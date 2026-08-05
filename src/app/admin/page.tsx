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

function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  trend,
  href,
}: {
  label: string
  value: string | number
  hint?: string
  tone?: "neutral" | "accent" | "positive" | "warning" | "critical"
  trend?: "up" | "down" | "neutral"
  href?: string
}) {
  const toneClass = {
    neutral: "text-white",
    accent: "text-[#C084FC]",
    positive: "text-emerald-400",
    warning: "text-amber-400",
    critical: "text-red-400",
  }[tone]

  const frameClass =
    tone === "critical"
      ? "border-red-500/20 bg-red-500/5 hover:border-red-500/40"
      : tone === "accent"
        ? "border-[#7C3AED]/30 bg-[#7C3AED]/10 hover:border-[#7C3AED]/50"
        : tone === "positive"
          ? "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40"
          : tone === "warning"
            ? "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40"
            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"

  const content = (
    <div className="relative overflow-hidden group">
      {/* Subtle top light bar */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center justify-between">
        <p className="text-xs font-mono uppercase tracking-wider text-zinc-400 truncate">{label}</p>
        {trend && (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
            trend === "up" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
          }`}>
            {trend === "up" ? "↑" : "→"}
          </span>
        )}
      </div>

      <p className={`text-3xl font-bold mt-2 tabular-nums tracking-tight ${toneClass}`}>{value}</p>

      {hint && <p className="text-[11px] text-zinc-500 mt-1.5 truncate">{hint}</p>}
    </div>
  )

  const className = `rounded-2xl border p-5 backdrop-blur-xl transition-all duration-200 ${frameClass}`

  if (href) {
    return (
      <Link href={href} className={`${className} block`}>
        {content}
      </Link>
    )
  }
  return <div className={className}>{content}</div>
}

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
    prisma.event.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
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
      take: 5,
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

  return (
    <div className="space-y-8 pb-12">
      {/* Top Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-zinc-400">Purity OS · Vue Centrale</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-zinc-400 mt-1">
            {actionItems.length > 0 || newEventsCount > 0 || pendingDraftsCount > 0
              ? `⚠️ ${actionItems.length + (newEventsCount > 0 ? 1 : 0) + (pendingDraftsCount > 0 ? 1 : 0)} élément(s) demandent une action immédiate.`
              : "✅ Tous les voyants sont au vert — aucun blocage détecté."}
          </p>
        </div>

        {/* Quick Action Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/admin/acquisition"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/20 transition-all flex items-center gap-1.5"
          >
            <span>🎯 Prospection</span>
            {pendingDraftsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-bold font-mono">
                {pendingDraftsCount}
              </span>
            )}
          </Link>
          <Link
            href="/admin/inbox"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 transition-colors flex items-center gap-1.5"
          >
            <span>📥 Inbox</span>
            {newEventsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-violet-500 text-white text-[10px] font-bold font-mono">
                {newEventsCount}
              </span>
            )}
          </Link>
          <Link
            href="/admin/clients"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 transition-colors"
          >
            + Client
          </Link>
        </div>
      </div>

      {/* KPI Ribbon — 8 cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Nouvelles Demandes"
          value={newEventsCount}
          hint="Formulaires, RDV, commandes"
          tone={newEventsCount > 0 ? "accent" : "neutral"}
          trend={newEventsCount > 0 ? "up" : undefined}
          href="/admin/inbox"
        />
        <StatCard
          label="Projets Actifs"
          value={activeProjects}
          hint={`Sur ${totalProjects} projets au total`}
          href="/admin/projects?status=ACTIVE"
        />
        <StatCard
          label="Base Clients"
          value={totalClients}
          hint={inactiveClients > 0 ? `${inactiveClients} accès non activés` : "100% comptes activés"}
          href="/admin/clients"
        />
        <StatCard
          label="Encaissements Confirmés"
          value={formatEUR(totalPaid)}
          hint="Factures & acomptes payés"
          tone="positive"
          trend="up"
          href="/admin/payments?status=PAID"
        />
        <StatCard
          label="Solde à Encaisser"
          value={formatEUR(totalPending)}
          hint="Paiements en attente"
          tone={totalPending > 0 ? "warning" : "neutral"}
          href="/admin/payments?status=PENDING"
        />
        <StatCard
          label="Récurrent Mensuel (MRR)"
          value={formatEUR(monthlyRecurring)}
          hint="Suivis & hébergements actifs"
          tone="accent"
          trend="up"
        />
        <StatCard
          label="Missions & Tâches IA"
          value={aiEventsCount}
          hint="Événements inter-agents P01-P06"
          tone="accent"
          href="/admin/inbox?type=AI"
        />
        <StatCard
          label="Audit Sentinel"
          value={systemEventsCount}
          hint="Santé et sécurité du système"
          tone="positive"
          href="/admin/inbox?type=SYSTEM"
        />
      </div>

      {/* AI Ecosystem Live Architecture */}
      <section className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/20 via-[#060309] to-black p-6 backdrop-blur-2xl shadow-2xl shadow-violet-950/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/30 font-mono">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                Matrice 6 Pôles IA
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">Architecture V2.0</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight mt-2">Purity Agency AI Matrix</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Supervisez les 6 Pôles opérationnels pilotés par les agents autonomes Purity OS.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/ecosystem"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-lg shadow-violet-600/20"
            >
              Équipe IA Complète →
            </Link>
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {POLES.map((pole) => {
            const isActive = activeDepartments.has(`${pole.id}_${pole.name.split(" ")[0].toUpperCase()}`) ||
              [...activeDepartments].some((d) => d.startsWith(`${pole.id}_`))
            const hasCode = pole.chief.coded || pole.agents.some((a) => a.coded)
            const status = isActive ? "ACTIF" : hasCode ? "OPÉRATIONNEL" : "PLANIFIÉ"
            const statusColor = isActive ? "text-emerald-400" : hasCode ? "text-amber-400" : "text-zinc-600"
            const codedCount = pole.agents.filter((a) => a.coded).length + (pole.chief.coded ? 1 : 0)

            return (
              <div
                key={pole.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-violet-500/30 p-4.5 backdrop-blur-xl flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-white">
                      PÔLE {pole.id}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold font-mono ${statusColor}`}>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      {status}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm group-hover:text-violet-300 transition-colors">{pole.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{pole.chief.fullName}</p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{pole.chief.role}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {codedCount} agent(s) actif(s)
                  </span>
                  <Link
                    href={`/admin/${pole.id === '01' ? 'acquisition' : pole.id === '02' ? 'finance' : 'ecosystem'}`}
                    className="text-xs font-semibold text-violet-400 hover:text-white transition-colors"
                  >
                    Ouvrir →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Priority Action Center */}
      {actionItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>⚠️ Action Center</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                {actionItems.length} urgent(s)
              </span>
            </h2>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-black/40 backdrop-blur-xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {actionItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-white/[0.03] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base shrink-0">{item.icon}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-white group-hover:text-violet-300 transition-colors truncate">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">{item.context}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                      item.tone === "critical"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {item.badge}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Activity Streams Grid (Client Requests & AI Logs) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Inquiries Feed */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>📩 Demandes & Formulaires Clients</span>
            </h2>
            <Link href="/admin/inbox" className="text-xs text-violet-400 hover:underline font-medium">
              Voir tout →
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.01] backdrop-blur-xl overflow-hidden">
            {recentEvents.length === 0 ? (
              <p className="p-6 text-xs text-zinc-500 text-center">Aucune nouvelle demande client enregistrée.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {recentEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={event.projectId ? `/admin/projects/${event.projectId}` : "/admin/inbox"}
                    className="flex items-center justify-between gap-3 p-3.5 hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-white group-hover:text-violet-300 transition-colors truncate">
                        {event.name || event.email || "Contact anonyme"}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {event.summary || EVENT_TYPE_LABELS[event.type] || event.type}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${EVENT_TYPE_COLORS[event.type] ?? "bg-white/10 text-zinc-300"}`}>
                        {EVENT_TYPE_LABELS[event.type] ?? event.type}
                      </span>
                      <p className="text-[10px] text-zinc-500 font-mono mt-1">{formatDateTime(event.createdAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Live Sentinel & AI Log Stream */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>🤖 Flux d&apos;Activité Sentinel & Agent AI</span>
            </h2>
            <Link href="/admin/inbox?type=AI" className="text-xs text-violet-400 hover:underline font-medium">
              Journal IA →
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.01] backdrop-blur-xl overflow-hidden">
            {recentAiSystemEvents.length === 0 ? (
              <p className="p-6 text-xs text-zinc-500 text-center">Aucun événement système récent.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {recentAiSystemEvents.map((event) => (
                  <Link
                    key={event.id}
                    href="/admin/inbox?type=AI"
                    className="flex items-center justify-between gap-3 p-3.5 hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-white group-hover:text-violet-300 transition-colors truncate">
                        {event.summary || "Activité système de fond"}
                      </p>
                      <p className="text-[11px] text-zinc-400 font-mono truncate mt-0.5">
                        {event.name || "Purity Kernel"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${EVENT_TYPE_COLORS[event.type] ?? "bg-white/10 text-zinc-300"}`}>
                        {EVENT_TYPE_LABELS[event.type] ?? event.type}
                      </span>
                      <p className="text-[10px] text-zinc-500 font-mono mt-1">{formatDateTime(event.createdAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
