import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import Link from "next/link"
import type { Prisma } from "@prisma/client"
import { formatDate, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from "@/lib/adminFormat"

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  await requireAdminSession()
  const sp = await searchParams
  const query = (sp.q ?? "").trim().slice(0, 100)

  const where: Prisma.UserWhereInput = {
    role: "CLIENT",
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const clients = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      projects: { orderBy: { updatedAt: "desc" } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Clients</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Chaque fiche regroupe les projets, paiements, documents et demandes d&apos;origine du client.
        </p>
      </div>

      <form method="get" className="flex gap-2 max-w-md">
        <label htmlFor="client-search" className="sr-only">Rechercher un client</label>
        <input
          id="client-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Rechercher par nom ou e-mail…"
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/60"
        />
        <button
          type="submit"
          className="rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors active:scale-[0.98]"
        >
          Chercher
        </button>
        {query && (
          <Link
            href="/admin/clients"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5 transition-colors flex items-center"
          >
            Effacer
          </Link>
        )}
      </form>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {clients.length === 0 ? (
          <p className="p-6 text-sm text-zinc-400">
            {query ? `Aucun client ne correspond à « ${query} ».` : "Aucun client enregistré."}
          </p>
        ) : (
          <div className="divide-y divide-white/10">
            {clients.map((client) => {
              const activeProjects = client.projects.filter((p) => p.status !== "COMPLETED" && p.status !== "CANCELLED")
              const latest = client.projects[0]
              return (
                <Link
                  key={client.id}
                  href={`/admin/clients/${client.id}`}
                  className="flex items-center justify-between gap-4 p-5 hover:bg-white/5 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{client.name || "Client sans nom"}</p>
                    <p className="text-sm text-zinc-400 truncate">{client.email}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Depuis le {formatDate(client.createdAt)}
                      {!client.passwordHash && <span className="text-amber-400"> · accès non activé</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {latest ? (
                      <>
                        <p className="text-sm text-zinc-200 truncate max-w-[220px]">{latest.name}</p>
                        <span className={`text-[11px] px-2 py-0.5 rounded inline-block mt-1 ${PROJECT_STATUS_COLORS[latest.status] ?? "bg-white/10 text-zinc-300"}`}>
                          {PROJECT_STATUS_LABELS[latest.status] ?? latest.status}
                        </span>
                        {client.projects.length > 1 && (
                          <p className="text-[11px] text-zinc-500 mt-1">
                            {client.projects.length} projets · {activeProjects.length} actif(s)
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-zinc-500">Aucun projet</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
