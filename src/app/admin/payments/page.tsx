import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"

function eur(amount: number) { return new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(amount) }

export default async function AdminPaymentsPage() {
  await requireAdminSession()
  const payments = await prisma.payment.findMany({ orderBy: { createdAt: "desc" }, include: { project: { select: { name: true, client: { select: { email: true } } } } } })
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Paiements</h1>
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {payments.length === 0 ? <p className="p-6 text-sm text-zinc-400">Aucun paiement enregistré.</p> : <div className="divide-y divide-white/10">
          {payments.map((payment) => <div key={payment.id} className="flex items-center justify-between p-5"><div><p className="font-medium text-white">{payment.project.name}</p><p className="text-xs text-zinc-400">{payment.project.client.email} · {payment.type}</p></div><div className="text-right"><p className="font-semibold text-white">{eur(payment.amount)}</p><p className="text-xs text-zinc-400">{payment.status}</p></div></div>)}
        </div>}
      </div>
    </div>
  )
}
