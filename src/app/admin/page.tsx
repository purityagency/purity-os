import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
  ])

  const totalPaid = paidAgg._sum.amount ?? 0
  const totalPending = pendingAgg._sum.amount ?? 0
  const monthlyRecurring = activeMonthlyProjects.reduce((sum: number, p) => sum + (p.monthlyAmount ?? 0), 0)

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
            <p className="text-xs text-zinc-500 mt-1">Total des paiements Stripe confirmés</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Soldes en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-400">{formatEUR(totalPending)}</div>
            <p className="text-xs text-zinc-500 mt-1">À encaisser à la livraison (hors Stripe)</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Récurrent mensuel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#7C3AED]">{formatEUR(monthlyRecurring)}</div>
            <p className="text-xs text-zinc-500 mt-1">Somme des suivis mensuels actifs (Stripe)</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold mb-4 text-white">Dernières Activités</h2>
      <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md">
        <CardContent className="p-0">
          <div className="divide-y divide-white/5">
            {recentStages.length === 0 ? (
              <div className="p-6 text-zinc-400 text-sm text-center">Aucune activité récente.</div>
            ) : (
              recentStages.map((stage) => (
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
