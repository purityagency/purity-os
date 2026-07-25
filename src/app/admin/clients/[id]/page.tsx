import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { notFound } from "next/navigation"
import Link from "next/link"
import { resendClientInvite, updateClientDetails } from "@/actions/clientActions"
import {
  formatEUR,
  formatDate,
  formatDateTime,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PAYMENT_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  sectorLabel,
} from "@/lib/adminFormat"

export default async function AdminClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession()
  const { id } = await params

  const client = await prisma.user.findUnique({
    where: { id },
    include: {
      projects: {
        orderBy: { updatedAt: "desc" },
        include: {
          stages: { orderBy: { orderIndex: "asc" } },
          payments: { orderBy: { createdAt: "desc" } },
          documents: { orderBy: { uploadedAt: "desc" } },
          events: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  })

  if (!client || client.role !== "CLIENT") notFound()

  // Demandes entrantes de ce contact, y compris celles jamais converties en projet
  const events = await prisma.event.findMany({
    where: { email: client.email },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  const allPayments = client.projects.flatMap((p) => p.payments)
  const totalPaid = allPayments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.amount, 0)
  const totalPending = allPayments.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + p.amount, 0)
  const monthlyRecurring = client.projects
    .filter((p) => p.status !== "COMPLETED" && p.status !== "CANCELLED")
    .reduce((sum, p) => sum + (p.monthlyAmount ?? 0), 0)
  const documentCount = client.projects.reduce((sum, p) => sum + p.documents.length, 0)

  const hasAccount = Boolean(client.passwordHash)
  const resendInvite = resendClientInvite.bind(null, client.id)
  const updateDetails = updateClientDetails.bind(null, client.id)

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <Link href="/admin/clients" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Tous les clients
        </Link>
        <div className="mt-2 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{client.name || "Client sans nom"}</h1>
            <p className="text-sm text-zinc-400 mt-1">
              <a href={`mailto:${client.email}`} className="hover:text-white transition-colors">{client.email}</a>
              {" · "}Client depuis le {formatDate(client.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${hasAccount ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
              {hasAccount ? "Compte actif" : "Accès non activé"}
            </span>
            <form action={resendInvite}>
              <button
                type="submit"
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5 transition-colors active:scale-[0.98]"
              >
                {hasAccount ? "Renvoyer un lien d'accès" : "Envoyer l'invitation"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs text-zinc-500">Encaissé</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">{formatEUR(totalPaid)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs text-zinc-500">En attente</p>
          <p className="text-2xl font-bold text-amber-400 mt-1 tabular-nums">{formatEUR(totalPending)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs text-zinc-500">Récurrent</p>
          <p className="text-2xl font-bold text-[#C084FC] mt-1 tabular-nums">{formatEUR(monthlyRecurring)}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">par mois</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs text-zinc-500">Documents</p>
          <p className="text-2xl font-bold text-white mt-1 tabular-nums">{documentCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Projects */}
          <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="font-semibold text-white">Projets ({client.projects.length})</h2>
              <Link href="/admin/projects" className="text-xs text-[#C084FC] hover:underline">Nouveau projet →</Link>
            </div>
            {client.projects.length === 0 ? (
              <p className="p-5 text-sm text-zinc-400">Aucun projet pour ce client.</p>
            ) : (
              <div className="divide-y divide-white/10">
                {client.projects.map((project) => {
                  const done = project.stages.filter((s) => s.status === "COMPLETED").length
                  const total = project.stages.length
                  const percent = total > 0 ? Math.round((done / total) * 100) : 0
                  return (
                    <Link key={project.id} href={`/admin/projects/${project.id}`} className="block p-5 hover:bg-white/5 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{project.name}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {sectorLabel(project.sector) ?? "Secteur non défini"}
                            {project.estimatedDelivery ? ` · Livraison ${formatDate(project.estimatedDelivery)}` : ""}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded shrink-0 ${PROJECT_STATUS_COLORS[project.status] ?? "bg-white/10 text-zinc-300"}`}>
                          {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                        </span>
                      </div>
                      {total > 0 && (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                          <span className="text-[11px] text-zinc-500 tabular-nums shrink-0">{done}/{total} étapes</span>
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* Payments */}
          <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <h2 className="font-semibold text-white p-5 border-b border-white/10">Paiements</h2>
            {allPayments.length === 0 ? (
              <p className="p-5 text-sm text-zinc-400">Aucun paiement enregistré.</p>
            ) : (
              <div className="divide-y divide-white/10">
                {allPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-medium text-white">{PAYMENT_TYPE_LABELS[payment.type] ?? payment.type}</p>
                      <p className="text-xs text-zinc-500">{formatDate(payment.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-white tabular-nums">{formatEUR(payment.amount)}</span>
                      <span className={`text-xs px-2 py-1 rounded ${PAYMENT_STATUS_COLORS[payment.status] ?? "bg-white/10 text-zinc-300"}`}>
                        {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {/* Edit client */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-semibold text-white mb-4">Fiche client</h2>
            <form action={updateDetails} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="client-name" className="block text-xs text-zinc-400">Nom</label>
                <input
                  id="client-name"
                  name="name"
                  defaultValue={client.name ?? ""}
                  required
                  maxLength={200}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/60"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="client-email" className="block text-xs text-zinc-400">E-mail (identifiant de connexion)</label>
                <input
                  id="client-email"
                  value={client.email}
                  readOnly
                  aria-describedby="email-help"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-zinc-400 cursor-not-allowed"
                />
                <p id="email-help" className="text-[11px] text-zinc-500">Non modifiable : c&apos;est l&apos;identifiant de connexion du client.</p>
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 text-sm font-medium text-white transition-colors active:scale-[0.98]"
              >
                Enregistrer
              </button>
            </form>
          </section>

          {/* Incoming requests history */}
          <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <h2 className="font-semibold text-white p-5 border-b border-white/10">Demandes reçues</h2>
            {events.length === 0 ? (
              <p className="p-5 text-sm text-zinc-400">Aucune demande liée à cette adresse.</p>
            ) : (
              <div className="divide-y divide-white/10">
                {events.map((event) => (
                  <div key={event.id} className="p-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] px-2 py-0.5 rounded ${EVENT_TYPE_COLORS[event.type] ?? "bg-white/10 text-zinc-300"}`}>
                        {EVENT_TYPE_LABELS[event.type] ?? event.type}
                      </span>
                      <span className="text-[11px] text-zinc-500">{formatDateTime(event.createdAt)}</span>
                    </div>
                    {event.summary && <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">{event.summary}</p>}
                    {event.projectId && (
                      <Link href={`/admin/projects/${event.projectId}`} className="text-[11px] text-[#C084FC] hover:underline mt-1 inline-block">
                        Projet lié →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
