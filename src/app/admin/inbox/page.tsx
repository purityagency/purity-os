import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { markEventSeen, markEventDone, reopenEvent } from "@/actions/eventActions"
import { EventConvertForm } from "@/components/EventConvertForm"
import Link from "next/link"
import type { Prisma } from "@prisma/client"
import {
  formatDateTime,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  EVENT_STATUS_LABELS,
  EVENT_STATUS_COLORS,
} from "@/lib/adminFormat"
import { InboxIcon, SparklesIcon, MailIcon } from "@/components/icons"

const VALID_TYPES = ["LEAD", "BOOKING", "ORDER", "SYSTEM", "AI"] as const
const VALID_STATUSES = ["NEW", "SEEN", "DONE"] as const

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
        active ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
      }`}
    >
      {children}
    </Link>
  )
}

export default async function AdminInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>
}) {
  await requireAdminSession()
  const sp = await searchParams

  const typeFilter = VALID_TYPES.includes(sp.type as (typeof VALID_TYPES)[number]) ? sp.type : undefined
  const statusFilter = VALID_STATUSES.includes(sp.status as (typeof VALID_STATUSES)[number]) ? sp.status : undefined

  const where: Prisma.EventWhereInput = {
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  }

  const [events, counts, newCount, seenCount, doneCount] = await Promise.all([
    prisma.event.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.event.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.event.count({ where: { status: "NEW" } }),
    prisma.event.count({ where: { status: "SEEN" } }),
    prisma.event.count({ where: { status: "DONE" } }),
  ])

  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]))
  const buildHref = (next: { type?: string; status?: string }) => {
    const params = new URLSearchParams()
    const type = next.type !== undefined ? next.type : typeFilter
    const status = next.status !== undefined ? next.status : statusFilter
    if (type) params.set("type", type)
    if (status) params.set("status", status)
    const qs = params.toString()
    return qs ? `/admin/inbox?${qs}` : "/admin/inbox"
  }

  return (
    <div className="h-[calc(100vh-90px)] flex flex-col space-y-4 overflow-hidden">
      {/* Header Compact */}
      <div className="shrink-0 space-y-3 border-b border-white/5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Communication & Entrées · Pôle 05</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
              <InboxIcon className="w-6 h-6 text-violet-400" />
              <span>Boîte de Réception Unifiée</span>
            </h1>
          </div>
        </div>

        {/* KPI Ribbon Strip */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">À Traiter</span>
            <span className="text-base font-bold text-violet-400 tabular-nums">{newCount} nouvelles</span>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">En Cours</span>
            <span className="text-base font-bold text-amber-400 tabular-nums">{seenCount} vues</span>
          </div>
          <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Traitées / Classées</span>
            <span className="text-base font-bold text-emerald-400 tabular-nums">{doneCount} traîtées</span>
          </div>
        </div>
      </div>

      {/* Main Content Split Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 overflow-hidden">
        {/* Left (2/3 width) - Events Table & Filters */}
        <div className="lg:col-span-2 flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 shrink-0 text-xs">
            <div className="flex items-center gap-1 overflow-x-auto">
              <span className="text-[10px] font-mono text-zinc-500 uppercase mr-1">Type:</span>
              <FilterLink href={buildHref({ type: "" })} active={!typeFilter}>Tous</FilterLink>
              {VALID_TYPES.map((type) => (
                <FilterLink key={type} href={buildHref({ type })} active={typeFilter === type}>
                  {EVENT_TYPE_LABELS[type]}
                </FilterLink>
              ))}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              <span className="text-[10px] font-mono text-zinc-500 uppercase mr-1">Statut:</span>
              <FilterLink href={buildHref({ status: "" })} active={!statusFilter}>Tous</FilterLink>
              {VALID_STATUSES.map((status) => (
                <FilterLink key={status} href={buildHref({ status })} active={statusFilter === status}>
                  {EVENT_STATUS_LABELS[status]}
                  {countByStatus[status] ? ` (${countByStatus[status]})` : ""}
                </FilterLink>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {events.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
                <InboxIcon className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400">
                  {typeFilter || statusFilter ? "Aucune demande ne correspond à ce filtre." : "Boîte vide."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden bg-black/30">
                {events.map((event) => {
                  const payload = (event.payload as Record<string, unknown> | null) ?? null
                  const need = payload && typeof payload.need === "string" ? payload.need : null
                  const markSeen = markEventSeen.bind(null, event.id)
                  const markDone = markEventDone.bind(null, event.id)
                  const reopen = reopenEvent.bind(null, event.id)

                  return (
                    <div key={event.id} className="p-3 hover:bg-white/[0.03] transition-colors">
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded ${EVENT_TYPE_COLORS[event.type] ?? "bg-white/10 text-zinc-300"}`}>
                              {EVENT_TYPE_LABELS[event.type] ?? event.type}
                            </span>
                            <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded ${EVENT_STATUS_COLORS[event.status] ?? "bg-white/10 text-zinc-300"}`}>
                              {EVENT_STATUS_LABELS[event.status] ?? event.status}
                            </span>
                            <span className="text-[9px] text-zinc-500 font-mono">{formatDateTime(event.createdAt)}</span>
                          </div>

                          <p className="font-bold text-xs text-white">
                            {event.name || "Contact anonyme"}
                            {event.company ? <span className="text-zinc-400 font-normal"> · {event.company}</span> : null}
                          </p>

                          <p className="text-[10px] text-zinc-400 flex flex-wrap gap-x-3 font-mono">
                            {event.email && <a href={`mailto:${event.email}`} className="hover:text-white transition-colors">{event.email}</a>}
                            {event.phone && <a href={`tel:${event.phone}`} className="hover:text-white transition-colors">{event.phone}</a>}
                          </p>

                          {event.summary && <p className="text-xs text-zinc-300 leading-relaxed">{event.summary}</p>}
                          {need && need !== event.summary && (
                            <p className="text-[10px] text-zinc-500 leading-relaxed">{need}</p>
                          )}

                          {event.projectId && (
                            <Link href={`/admin/projects/${event.projectId}`} className="text-[10px] text-violet-400 hover:underline inline-block font-mono">
                              Dossier Client →
                            </Link>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {event.status === "NEW" && (
                            <form action={markSeen}>
                              <button type="submit" className="rounded-lg border border-white/10 px-2 py-0.5 text-xs font-medium text-zinc-200 hover:bg-white/5 transition-colors cursor-pointer">
                                Vu
                              </button>
                            </form>
                          )}
                          {event.status !== "DONE" && (
                            <form action={markDone}>
                              <button type="submit" className="rounded-lg border border-white/10 px-2 py-0.5 text-xs font-medium text-zinc-200 hover:bg-white/5 transition-colors cursor-pointer">
                                Traité
                              </button>
                            </form>
                          )}
                          {event.status === "DONE" && !event.projectId && (
                            <form action={reopen}>
                              <button type="submit" className="rounded-lg border border-white/10 px-2 py-0.5 text-xs font-medium text-zinc-400 hover:bg-white/5 transition-colors cursor-pointer">
                                Rouvrir
                              </button>
                            </form>
                          )}
                          {!event.projectId && event.type !== "ORDER" && event.email && (
                            <EventConvertForm
                              eventId={event.id}
                              defaultName={event.name ?? ""}
                              defaultEmail={event.email}
                              defaultProjectName={event.company ? `Projet ${event.company}` : ""}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right (1/3 width) - Dispatching & Channel rules */}
        <div className="flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden justify-between space-y-4">
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <MailIcon className="w-4 h-4 text-violet-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                  Canal contact@purity-agency.be
                </h2>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Toute prise de contact issue du site public est qualifiée et transmise en temps réel au **Chief Sales AI (Vincent Delcourt)** & au **COO Kernel**.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-violet-500/20 bg-violet-500/5 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-400">Routage Auto:</span>
                <span className="text-emerald-400 font-bold">Actif</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Délai Réponse IA:</span>
                <span className="text-white font-bold">&lt; 5 min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Conformité AI Act:</span>
                <span className="text-cyan-400 font-bold">Inclus</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-white/5 bg-black/40 text-[10px] text-zinc-500 font-mono">
            Purity OS Dispatcher Engine
          </div>
        </div>
      </div>
    </div>
  )
}
