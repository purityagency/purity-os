import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { markEventSeen, markEventDone } from "@/actions/eventActions"
import Link from "next/link"

const TYPE_LABEL: Record<string, string> = { LEAD: "Question / Lead", BOOKING: "RDV", ORDER: "Commande" }
const TYPE_COLOR: Record<string, string> = {
  LEAD: "bg-sky-500/20 text-sky-300",
  BOOKING: "bg-amber-500/20 text-amber-300",
  ORDER: "bg-emerald-500/20 text-emerald-300",
}
const STATUS_COLOR: Record<string, string> = {
  NEW: "bg-[#7C3AED]/20 text-[#7C3AED]",
  SEEN: "bg-white/10 text-zinc-300",
  DONE: "bg-white/5 text-zinc-500",
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-BE", { dateStyle: "short", timeStyle: "short" }).format(date)
}

export default async function AdminInboxPage() {
  await requireAdminSession()
  const events = await prisma.event.findMany({ orderBy: { createdAt: "desc" }, take: 100 })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Boîte de réception</h1>
        <p className="text-sm text-zinc-400 mt-1">Questions, rendez-vous et commandes venant du site public.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {events.length === 0 ? (
          <p className="p-6 text-sm text-zinc-400">Rien pour l&apos;instant.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {events.map((event) => {
              const payload = (event.payload as Record<string, unknown> | null) ?? null
              const projectId = payload && typeof payload.projectId === "string" ? payload.projectId : null
              const markSeen = markEventSeen.bind(null, event.id)
              const markDone = markEventDone.bind(null, event.id)

              return (
                <div key={event.id} className="flex flex-col gap-2 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${TYPE_COLOR[event.type] ?? "bg-white/10 text-zinc-300"}`}>
                        {TYPE_LABEL[event.type] ?? event.type}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${STATUS_COLOR[event.status] ?? "bg-white/10 text-zinc-300"}`}>
                        {event.status}
                      </span>
                      <span className="text-xs text-zinc-500">{formatDate(event.createdAt)}</span>
                    </div>
                    <p className="font-medium text-white mt-2 truncate">
                      {event.name || "—"}
                      {event.company ? ` · ${event.company}` : ""}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {[event.email, event.phone].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {event.summary && <p className="text-sm text-zinc-300 mt-1">{event.summary}</p>}
                    {projectId && (
                      <Link href={`/admin/projects/${projectId}`} className="text-xs text-[#7C3AED] hover:underline mt-1 inline-block">
                        Voir le projet →
                      </Link>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {event.status === "NEW" && (
                      <form action={markSeen}>
                        <button type="submit" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5">
                          Marquer vu
                        </button>
                      </form>
                    )}
                    {event.status !== "DONE" && (
                      <form action={markDone}>
                        <button type="submit" className="rounded-lg bg-[#7C3AED] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#6D28D9]">
                          Marquer traité
                        </button>
                      </form>
                    )}
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
