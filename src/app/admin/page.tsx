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
  href,
}: {
  label: string
  value: string | number
  hint?: string
  tone?: "neutral" | "accent" | "positive" | "warning" | "critical"
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
      ? "border-red-500/20 bg-red-500/5"
      : tone === "accent"
        ? "border-[#7C3AED]/30 bg-[#7C3AED]/10"
        : "border-white/10 bg-white/5"

  const content = (
    <>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="text-[11px] text-zinc-500 mt-1">{hint}</p>}
    </>
  )

  const className = `rounded-2xl border p-5 backdrop-blur-md ${frameClass}`

  if (href) {
    return (
      <Link href={href} className={`${className} block hover:bg-white/[0.07] transition-colors`}>
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
    prisma.event.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
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
    // Clients invités qui n'ont jamais activé leur accès
    prisma.user.count({ where: { role: "CLIENT", passwordHash: null } }),
    prisma.event.count({ where: { type: "AI" } }),
    prisma.event.count({ where: { type: "SYSTEM" } }),
    prisma.event.findMany({
      where: { type: { in: ["AI", "SYSTEM"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.agentActivity.findMany({ select: { department: true, updatedAt: true } }),
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
      context: s.project.name,
      badge: STAGE_STATUS_LABELS.BLOCKED,
      tone: "critical" as const,
    })),
    ...overdueProjects.map((p) => ({
      id: `overdue-${p.id}`,
      href: `/admin/projects/${p.id}`,
      label: p.name,
      context: p.client.name ?? p.client.email,
      badge: `Échéance ${p.estimatedDelivery ? formatDate(p.estimatedDelivery) : ""}`.trim(),
      tone: "critical" as const,
    })),
    ...waitingStages.map((s) => ({
      id: `waiting-${s.id}`,
      href: `/admin/projects/${s.project.id}`,
      label: s.title,
      context: s.project.name,
      badge: STAGE_STATUS_LABELS.WAITING_CLIENT,
      tone: "warning" as const,
    })),
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Vue d&apos;ensemble</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {actionItems.length > 0 || newEventsCount > 0
            ? "Voici ce qui demande votre attention aujourd'hui."
            : "Rien ne bloque, tout est à jour."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Nouvelles demandes"
          value={newEventsCount}
          hint="Questions, RDV, commandes"
          tone="accent"
          href="/admin/inbox"
        />
        <StatCard
          label="Projets actifs"
          value={activeProjects}
          hint={`Sur ${totalProjects} au total`}
          href="/admin/projects?status=ACTIVE"
        />
        <StatCard label="Clients" value={totalClients} hint={inactiveClients > 0 ? `${inactiveClients} sans accès activé` : "Tous ont activé leur accès"} href="/admin/clients" />
        <StatCard label="Encaissé" value={formatEUR(totalPaid)} hint="Paiements confirmés" tone="positive" href="/admin/payments?status=PAID" />
        <StatCard label="À encaisser" value={formatEUR(totalPending)} hint="Soldes en attente" tone="warning" href="/admin/payments?status=PENDING" />
        <StatCard label="Récurrent mensuel" value={formatEUR(monthlyRecurring)} hint="Suivis actifs" tone="accent" />
        <StatCard label="Missions IA" value={aiEventsCount} hint="COO & Pôles 01-05" tone="accent" href="/admin/inbox?type=AI" />
        <StatCard label="Audit Sentinel" value={systemEventsCount} hint="Santé du système" tone="positive" href="/admin/inbox?type=SYSTEM" />
      </div>

      {/* AI Ecosystem Liquid Glass Section */}
      <section className="rounded-3xl border border-[#7C3AED]/30 bg-gradient-to-br from-[#7C3AED]/10 via-[#060309] to-white/[0.03] p-6 backdrop-blur-2xl shadow-[0_4px_30px_rgba(124,58,237,0.15)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#7C3AED]/20 text-[#C084FC] border border-[#7C3AED]/40">
                <span className="w-2 h-2 rounded-full bg-[#C084FC] animate-pulse" />
                COO IA & 5 Pôles Autonomes
              </span>
              <span className="text-xs text-zinc-400 font-mono">v2.0-SSOT</span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-2">Écosystème d&apos;Intelligence Autonome</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Gouvernance en temps réel et communication unifiée sur l&apos;Event Bus Purity OS.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/inbox?type=AI"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-all shadow-lg shadow-[#7C3AED]/20"
            >
              Voir missions IA →
            </Link>
            <Link
              href="/admin/inbox?type=SYSTEM"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 text-zinc-300 border border-white/10 hover:bg-white/10 transition-colors"
            >
              Logs Sentinel →
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {POLES.map((pole) => {
            // Actif = au moins un agent de ce pôle a une activité réelle
            // depuis 24h. Un pôle sans code n'affiche jamais "actif" — voir
            // plans/admin-apple-tier-rebuild.md étape 5 (correctif 2026-08-03,
            // avant ça ce statut était codé en dur "ACTIF" pour tout le monde).
            const isActive = activeDepartments.has(`${pole.id}_${pole.name.split(" ")[0].toUpperCase()}`) ||
              [...activeDepartments].some((d) => d.startsWith(`${pole.id}_`))
            const hasCode = pole.chief.coded || pole.agents.some((a) => a.coded)
            const status = isActive ? "ACTIF" : hasCode ? "CODÉ, INACTIF" : "PAS ENCORE CODÉ"
            const statusColor = isActive ? "text-emerald-400" : hasCode ? "text-amber-400" : "text-zinc-500"

            return (
              <div
                key={pole.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl flex flex-col justify-between transition-all hover:scale-[1.01]"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-white/10 text-white">
                      PÔLE {pole.id}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${statusColor}`}>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      {status}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base">{pole.name}</h3>
                  <p className="text-xs font-medium text-[#C084FC] mt-0.5">{pole.chief.fullName} · {pole.chief.role}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                    {pole.agents.filter((a) => a.coded).length + (pole.chief.coded ? 1 : 0)} agent(s) codé(s)
                  </span>
                  <Link
                    href="/admin/ecosystem"
                    className="text-xs font-semibold text-white hover:text-[#C084FC] transition-colors"
                  >
                    Voir l&apos;équipe →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Priority queue */}
      {actionItems.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-white mb-3">À traiter en priorité</h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="divide-y divide-white/10">
              {actionItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{item.label}</p>
                    <p className="text-xs text-zinc-500 truncate">{item.context}</p>
                  </div>
                  <span
                    className={`text-[11px] px-2 py-1 rounded shrink-0 ${
                      item.tone === "critical" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"
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

      {/* Recent requests */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-white">Dernières demandes clients</h2>
          <Link href="/admin/inbox" className="text-xs text-[#C084FC] hover:underline">
            Boîte de réception →
          </Link>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {recentEvents.length === 0 ? (
            <p className="p-6 text-sm text-zinc-400">Aucune demande reçue pour l&apos;instant.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {recentEvents.map((event) => (
                <Link
                  key={event.id}
                  href={event.projectId ? `/admin/projects/${event.projectId}` : "/admin/inbox"}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{event.name || event.email || "Contact sans nom"}</p>
                    <p className="text-xs text-zinc-500 truncate">
                      {event.summary || EVENT_TYPE_LABELS[event.type] || event.type}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[11px] px-2 py-1 rounded ${EVENT_TYPE_COLORS[event.type] ?? "bg-white/10 text-zinc-300"}`}>
                      {EVENT_TYPE_LABELS[event.type] ?? event.type}
                    </span>
                    <p className="text-[11px] text-zinc-500 mt-1">{formatDateTime(event.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Live AI & System activity feed */}
      {recentAiSystemEvents.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white">Activité IA & Surveillance Sentinel en direct</h2>
            <Link href="/admin/inbox?type=AI" className="text-xs text-[#C084FC] hover:underline">
              Voir tout le journal IA →
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="divide-y divide-white/10">
              {recentAiSystemEvents.map((event) => (
                <Link
                  key={event.id}
                  href="/admin/inbox"
                  className="flex items-center justify-between gap-4 p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{event.summary || "Activité système"}</p>
                    <p className="text-xs text-zinc-500 truncate">
                      {event.name || "Purity ONE Kernel"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[11px] px-2 py-1 rounded ${EVENT_TYPE_COLORS[event.type] ?? "bg-white/10 text-zinc-300"}`}>
                      {EVENT_TYPE_LABELS[event.type] ?? event.type}
                    </span>
                    <p className="text-[11px] text-zinc-500 mt-1">{formatDateTime(event.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
