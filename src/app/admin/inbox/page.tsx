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
    <div className="space-y-5">
      {/* Header Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">Inbox · {newCount} nouvelle(s) demande(s)</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">Boîte de Réception Unifiée</h1>
        </div>
      </div>

      {/* KPI Ribbon Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border border-violet-500/20 bg-violet-500/5 backdrop-blur-md">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Nouvelles (À Traiter)</span>
          <p className="text-xl font-bold text-violet-400 tabular-nums mt-0.5">{newCount}</p>
        </div>
        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">En Cours (Vues)</span>
          <p className="text-xl font-bold text-amber-400 tabular-nums mt-0.5">{seenCount}</p>
        </div>
        <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Traiteés / Classées</span>
          <p className="text-xl font-bold text-emerald-400 tabular-nums mt-0.5">{doneCount}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] border border-white/10 rounded-xl p-3">
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

      {/* Events High-Density Table */}
      <div className="rounded-xl border border-white/10 bg-white/[0.01] overflow-hidden backdrop-blur-xl">
        {events.length === 0 ? (
          <p className="p-8 text-xs text-zinc-500 text-center">
            {typeFilter || statusFilter ? "Aucune demande ne correspond à ce filtre." : "Boîte vide."}
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {events.map((event) => {
              const payload = (event.payload as Record<string, unknown> | null) ?? null
              const need = payload && typeof payload.need === "string" ? payload.need : null
              const markSeen = markEventSeen.bind(null, event.id)
              const markDone = markEventDone.bind(null, event.id)
              const reopen = reopenEvent.bind(null, event.id)

              return (
                <div key={event.id} className="p-3.5 hover:bg-white/[0.03] transition-colors">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${EVENT_TYPE_COLORS[event.type] ?? "bg-white/10 text-zinc-300"}`}>
                          {EVENT_TYPE_LABELS[event.type] ?? event.type}
                        </span>
                        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${EVENT_STATUS_COLORS[event.status] ?? "bg-white/10 text-zinc-300"}`}>
                          {EVENT_STATUS_LABELS[event.status] ?? event.status}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">{formatDateTime(event.createdAt)}</span>
                      </div>

                      <p className="font-semibold text-xs text-white">
                        {event.name || "Contact anonyme"}
                        {event.company ? <span className="text-zinc-400 font-normal"> · {event.company}</span> : null}
                      </p>

                      <p className="text-[11px] text-zinc-400 flex flex-wrap gap-x-3 font-mono">
                        {event.email && <a href={`mailto:${event.email}`} className="hover:text-white transition-colors">{event.email}</a>}
                        {event.phone && <a href={`tel:${event.phone}`} className="hover:text-white transition-colors">{event.phone}</a>}
                      </p>

                      {event.summary && <p className="text-xs text-zinc-300 leading-relaxed">{event.summary}</p>}
                      {need && need !== event.summary && (
                        <p className="text-[11px] text-zinc-500 leading-relaxed">{need}</p>
                      )}

                      {event.projectId && (
                        <Link href={`/admin/projects/${event.projectId}`} className="text-[11px] text-violet-400 hover:underline inline-block font-mono">
                          Dossier Client →
                        </Link>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {event.status === "NEW" && (
                        <form action={markSeen}>
                          <button type="submit" className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-white/5 transition-colors cursor-pointer">
                            Vu
                          </button>
                        </form>
                      )}
                      {event.status !== "DONE" && (
                        <form action={markDone}>
                          <button type="submit" className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-white/5 transition-colors cursor-pointer">
                            Traité
                          </button>
                        </form>
                      )}
                      {event.status === "DONE" && !event.projectId && (
                        <form action={reopen}>
                          <button type="submit" className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:bg-white/5 transition-colors cursor-pointer">
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
  )
}
