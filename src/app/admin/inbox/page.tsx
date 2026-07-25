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

const VALID_TYPES = ["LEAD", "BOOKING", "ORDER"] as const
const VALID_STATUSES = ["NEW", "SEEN", "DONE"] as const

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-[#7C3AED] text-white" : "border border-white/10 text-zinc-300 hover:bg-white/5"
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

  // Allowlist stricte : une valeur inattendue dans l'URL est ignorée, jamais
  // passée telle quelle à la requête.
  const typeFilter = VALID_TYPES.includes(sp.type as (typeof VALID_TYPES)[number]) ? sp.type : undefined
  const statusFilter = VALID_STATUSES.includes(sp.status as (typeof VALID_STATUSES)[number]) ? sp.status : undefined

  const where: Prisma.EventWhereInput = {
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  }

  const [events, counts] = await Promise.all([
    prisma.event.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.event.groupBy({ by: ["status"], _count: { _all: true } }),
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Boîte de réception</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Questions, rendez-vous et commandes venant du site public.
          {countByStatus.NEW ? ` ${countByStatus.NEW} nouvelle(s) à traiter.` : " Tout est traité."}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-zinc-500 uppercase tracking-wide mr-1">Type</span>
        <FilterLink href={buildHref({ type: "" })} active={!typeFilter}>Tous</FilterLink>
        {VALID_TYPES.map((type) => (
          <FilterLink key={type} href={buildHref({ type })} active={typeFilter === type}>
            {EVENT_TYPE_LABELS[type]}
          </FilterLink>
        ))}
        <span className="w-px h-5 bg-white/10 mx-2" aria-hidden="true" />
        <span className="text-[11px] text-zinc-500 uppercase tracking-wide mr-1">Statut</span>
        <FilterLink href={buildHref({ status: "" })} active={!statusFilter}>Tous</FilterLink>
        {VALID_STATUSES.map((status) => (
          <FilterLink key={status} href={buildHref({ status })} active={statusFilter === status}>
            {EVENT_STATUS_LABELS[status]}
            {countByStatus[status] ? ` (${countByStatus[status]})` : ""}
          </FilterLink>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {events.length === 0 ? (
          <p className="p-6 text-sm text-zinc-400">
            {typeFilter || statusFilter ? "Aucune demande ne correspond à ce filtre." : "Rien pour l'instant."}
          </p>
        ) : (
          <div className="divide-y divide-white/10">
            {events.map((event) => {
              const payload = (event.payload as Record<string, unknown> | null) ?? null
              const need = payload && typeof payload.need === "string" ? payload.need : null
              const markSeen = markEventSeen.bind(null, event.id)
              const markDone = markEventDone.bind(null, event.id)
              const reopen = reopenEvent.bind(null, event.id)

              return (
                <div key={event.id} className="p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${EVENT_TYPE_COLORS[event.type] ?? "bg-white/10 text-zinc-300"}`}>
                          {EVENT_TYPE_LABELS[event.type] ?? event.type}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${EVENT_STATUS_COLORS[event.status] ?? "bg-white/10 text-zinc-300"}`}>
                          {EVENT_STATUS_LABELS[event.status] ?? event.status}
                        </span>
                        <span className="text-xs text-zinc-500">{formatDateTime(event.createdAt)}</span>
                      </div>

                      <p className="font-medium text-white mt-2">
                        {event.name || "Contact sans nom"}
                        {event.company ? <span className="text-zinc-400 font-normal"> · {event.company}</span> : null}
                      </p>

                      <p className="text-xs text-zinc-400 mt-0.5 flex flex-wrap gap-x-3">
                        {event.email && <a href={`mailto:${event.email}`} className="hover:text-white transition-colors">{event.email}</a>}
                        {event.phone && <a href={`tel:${event.phone}`} className="hover:text-white transition-colors">{event.phone}</a>}
                        {!event.email && !event.phone && <span>Aucun contact fourni</span>}
                      </p>

                      {event.summary && <p className="text-sm text-zinc-300 mt-2 leading-relaxed">{event.summary}</p>}
                      {need && need !== event.summary && (
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{need}</p>
                      )}

                      {event.projectId && (
                        <Link href={`/admin/projects/${event.projectId}`} className="text-xs text-[#C084FC] hover:underline mt-2 inline-block">
                          Voir le dossier client →
                        </Link>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                      {event.status === "NEW" && (
                        <form action={markSeen}>
                          <button type="submit" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5 transition-colors active:scale-[0.98]">
                            Marquer vu
                          </button>
                        </form>
                      )}
                      {event.status !== "DONE" && (
                        <form action={markDone}>
                          <button type="submit" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5 transition-colors active:scale-[0.98]">
                            Marquer traité
                          </button>
                        </form>
                      )}
                      {event.status === "DONE" && !event.projectId && (
                        <form action={reopen}>
                          <button type="submit" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/5 transition-colors active:scale-[0.98]">
                            Rouvrir
                          </button>
                        </form>
                      )}
                      {/* Une commande payée a déjà son projet via /api/internal/provision */}
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
