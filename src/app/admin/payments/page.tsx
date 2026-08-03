import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { markPaymentPaid, markPaymentCancelled } from "@/actions/paymentActions"
import Link from "next/link"
import type { Prisma } from "@prisma/client"
import {
  formatEUR,
  formatDate,
  PAYMENT_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from "@/lib/adminFormat"

const VALID_STATUSES = ["PENDING", "PAID", "CANCELLED"] as const

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  await requireAdminSession()
  const sp = await searchParams
  const statusFilter = VALID_STATUSES.includes(sp.status as (typeof VALID_STATUSES)[number]) ? sp.status : undefined

  const where: Prisma.PaymentWhereInput = statusFilter ? { status: statusFilter } : {}

  const [payments, paidAgg, pendingAgg] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { project: { select: { id: true, name: true, client: { select: { id: true, name: true, email: true } } } } },
    }),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: "PENDING" }, _sum: { amount: true } }),
  ])

  const totalPaid = paidAgg._sum.amount ?? 0
  const totalPending = pendingAgg._sum.amount ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white">Paiements</h1>
          <p className="mt-1 text-sm text-zinc-400">Acomptes encaissés et soldes à relancer.</p>
        </div>
        <a
          href={`/api/admin/export/payments${statusFilter ? `?status=${statusFilter}` : ""}`}
          download
          className="rounded-lg border border-white/10 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 transition-colors shrink-0"
        >
          Exporter CSV
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs text-zinc-500">Encaissé</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">{formatEUR(totalPaid)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs text-zinc-500">À encaisser</p>
          <p className="text-2xl font-bold text-amber-400 mt-1 tabular-nums">{formatEUR(totalPending)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/payments"
          aria-current={!statusFilter ? "page" : undefined}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            !statusFilter ? "bg-[#7C3AED] text-white" : "border border-white/10 text-zinc-300 hover:bg-white/5"
          }`}
        >
          Tous
        </Link>
        {VALID_STATUSES.map((status) => (
          <Link
            key={status}
            href={`/admin/payments?status=${status}`}
            aria-current={statusFilter === status ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === status ? "bg-[#7C3AED] text-white" : "border border-white/10 text-zinc-300 hover:bg-white/5"
            }`}
          >
            {PAYMENT_STATUS_LABELS[status]}
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {payments.length === 0 ? (
          <p className="p-6 text-sm text-zinc-400">
            {statusFilter ? "Aucun paiement avec ce statut." : "Aucun paiement enregistré."}
          </p>
        ) : (
          <div className="divide-y divide-white/10">
            {payments.map((payment) => {
              const markPaid = markPaymentPaid.bind(null, payment.id, payment.project.id)
              const markCancelled = markPaymentCancelled.bind(null, payment.id, payment.project.id)
              return (
                <div key={payment.id} className="flex items-center justify-between gap-4 p-5 hover:bg-white/5 transition-colors">
                  <Link href={`/admin/projects/${payment.project.id}`} className="min-w-0 flex-1">
                    <p className="font-medium text-white truncate">{payment.project.name}</p>
                    <p className="text-xs text-zinc-400 truncate">
                      {payment.project.client.name || payment.project.client.email}
                      {" · "}
                      {PAYMENT_TYPE_LABELS[payment.type] ?? payment.type}
                      {" · "}
                      {formatDate(payment.createdAt)}
                    </p>
                  </Link>
                  <div className="flex items-center gap-3 shrink-0">
                    {payment.status === "PENDING" && (
                      <div className="flex gap-2">
                        <form action={markPaid}>
                          <button type="submit" className="h-7 px-2.5 text-xs rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors active:scale-[0.98]">
                            Marquer payé
                          </button>
                        </form>
                        <form action={markCancelled}>
                          <button type="submit" className="h-7 px-2.5 text-xs rounded bg-white/5 hover:bg-white/10 text-zinc-400 transition-colors active:scale-[0.98]">
                            Annuler
                          </button>
                        </form>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="font-semibold text-white tabular-nums">{formatEUR(payment.amount)}</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded inline-block mt-1 ${PAYMENT_STATUS_COLORS[payment.status] ?? "bg-white/10 text-zinc-300"}`}>
                        {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                      </span>
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
