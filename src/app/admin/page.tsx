import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

const EVENT_TYPE_LABEL: Record<string, string> = { LEAD: "Question / Lead", BOOKING: "RDV", ORDER: "Commande" }

function formatEUR(amount: number) {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
}

export default async function AdminDashboard() {
  const [
    totalProjects,
    activeProjects,
    totalClients,
    recentStages,
    paidAgg,
    pendingAgg,
    activeMonthlyProjects,
    overdueProjects,
    newEventsCount,
    recentEvents,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.user.count({ where: { role: 'CLIENT' } }),
    prisma.stage.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { project: true }
    }),
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
    prisma.project.findMany({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] }, monthlyAmount: { not: null } },
      select: { monthlyAmount: true },
    }),
    prisma.project.findMany({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] }, estimatedDelivery: { lt: new Date() } },
      orderBy: { estimatedDelivery: 'asc' },
      take: 5,
      include: { client: { select: { name: true, email: true } } },
    }),
    prisma.event.count({ where: { status: 'NEW' } }),
    prisma.event.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ])

  const totalPaid = paidAgg._sum.amount ?? 0
  const totalPending = pendingAgg._sum.amount ?? 0
  const monthlyRecurring = activeMonthlyProjects.reduce((sum: number, p: { monthlyAmount: number | null }) => sum + (p.monthlyAmount ?? 0), 0)

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-white">Vue d&apos;ensemble</h1>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Projets Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#7C3AED]">{activeProjects}</div>
            <p className="text-xs text-zinc-500 mt-1">Sur un total de {totalProjects} projets</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Clients Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#7C3AED]">{totalClients}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Encaissé (acomptes)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-400">{formatEUR(totalPaid)}</div>
            <p className="text-xs text-zinc-500 mt-1">Total des paiements Mollie confirmés</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Soldes en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-400">{formatEUR(totalPending)}</div>
            <p className="text-xs text-zinc-500 mt-1">À encaisser à la livraison</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Récurrent mensuel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#7C3AED]">{formatEUR(monthlyRecurring)}</div>
            <p className="text-xs text-zinc-500 mt-1">Somme des suivis mensuels actifs</p>
          </CardContent>
        </Card>

        <Card className="bg-red-500/5 border-red-500/20 text-white backdrop-blur-md">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-400">Projets en retard</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-red-400">{overdueProjects.length}</div><p className="text-xs text-zinc-500 mt-1">Action requise aujourd&apos;hui</p></CardContent>
        </Card>

        <Link href="/admin/inbox" className="block">
          <Card className="bg-[#7C3AED]/10 border-[#7C3AED]/30 text-white backdrop-blur-md hover:bg-[#7C3AED]/15 transition-colors h-full">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-400">Nouveaux — à traiter</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-[#7C3AED]">{newEventsCount}</div><p className="text-xs text-zinc-500 mt-1">Questions, RDV, commandes</p></CardContent>
          </Card>
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <Link href="/admin/inbox" className="rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white hover:bg-[#6D28D9]">Boîte de réception</Link>
        <Link href="/admin/projects" className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/5">Gérer les projets</Link>
        <Link href="/admin/documents" className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/5">Vérifier les documents</Link>
        <Link href="/admin/payments" className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/5">Suivre les paiements</Link>
      </div>

      {recentEvents.length > 0 && (
        <>
          <h2 className="text-xl font-bold mb-4 text-white">Dernières demandes</h2>
          <Card className="mb-8 bg-white/5 border-white/10 text-white backdrop-blur-md">
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {recentEvents.map((event) => (
                  <Link key={event.id} href="/admin/inbox" className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                    <div>
                      <p className="font-medium">{event.name || event.email || "—"}</p>
                      <p className="text-sm text-zinc-500">{event.summary || EVENT_TYPE_LABEL[event.type] || event.type}</p>
                    </div>
                    <div className="text-xs px-2 py-1 rounded bg-[#7C3AED]/20 text-[#7C3AED]">
                      {EVENT_TYPE_LABEL[event.type] ?? event.type}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {overdueProjects.length > 0 && <Card className="mb-8 border-red-500/20 bg-red-500/5 text-white"><CardHeader><CardTitle className="text-base">À traiter en priorité</CardTitle></CardHeader><CardContent className="space-y-3">{overdueProjects.map((project) => <Link key={project.id} href={`/admin/projects/${project.id}`} className="flex items-center justify-between rounded-lg border border-white/5 p-3 hover:bg-white/5"><span><span className="block font-medium">{project.name}</span><span className="text-xs text-zinc-400">{project.client.name ?? project.client.email}</span></span><span className="text-xs text-red-300">Échéance dépassée</span></Link>)}</CardContent></Card>}

      <h2 className="text-xl font-bold mb-4 text-white">Dernières Activités</h2>
      <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md">
        <CardContent className="p-0">
          <div className="divide-y divide-white/5">
            {recentStages.length === 0 ? (
              <div className="p-6 text-zinc-400 text-sm text-center">Aucune activité récente.</div>
            ) : (
              recentStages.map((stage: (typeof recentStages)[number]) => (
                <div key={stage.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                  <div>
                    <p className="font-medium">{stage.title}</p>
                    <p className="text-sm text-zinc-500">Projet: {stage.project.name}</p>
                  </div>
                  <div className="text-xs px-2 py-1 rounded bg-[#7C3AED]/20 text-[#7C3AED]">
                    {stage.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
