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
import { PaymentsIcon, SparklesIcon } from "@/components/icons"

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
    <div className="h-[calc(100vh-90px)] flex flex-col space-y-4 overflow-hidden">
      {/* Header Compact */}
      <div className="shrink-0 space-y-3 border-b border-white/5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Paiements & Trésorerie · Pôle 04</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
              <PaymentsIcon className="w-6 h-6 text-emerald-400" />
              <span>Console des Encaissements & Acomptes</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/api/admin/export/payments${statusFilter ? `?status=${statusFilter}` : ""}`}
              download
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors shrink-0"
            >
              ↓ Export Paiements CSV
            </a>
          </div>
        </div>

        {/* KPI Ribbon Strip */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Total Encaissé</span>
            <span className="text-base font-bold text-emerald-400 tabular-nums">{formatEUR(totalPaid)}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">À Encaisser</span>
            <span className="text-base font-bold text-amber-400 tabular-nums">{formatEUR(totalPending)}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Volume Transactions</span>
            <span className="text-base font-bold text-white tabular-nums">{payments.length} reçues</span>
          </div>
        </div>
      </div>

      {/* Main Content Split Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 overflow-hidden">
        {/* Left (2/3 width) - Payments List */}
        <div className="lg:col-span-2 flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden">
          {/* Filters Bar */}
          <div className="flex items-center justify-between mb-3 shrink-0 text-xs">
            <div className="flex items-center gap-1 overflow-x-auto">
              <Link
                href="/admin/payments"
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  !statusFilter ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Tous ({payments.length})
              </Link>
              {VALID_STATUSES.map((status) => (
                <Link
                  key={status}
                  href={`/admin/payments?status=${status}`}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    statusFilter === status ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {PAYMENT_STATUS_LABELS[status]}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {payments.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
                <PaymentsIcon className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400">
                  {statusFilter ? "Aucun paiement avec ce statut." : "Aucun paiement enregistré."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden bg-black/30">
                {payments.map((payment) => {
                  const markPaid = markPaymentPaid.bind(null, payment.id, payment.project.id)
                  const markCancelled = markPaymentCancelled.bind(null, payment.id, payment.project.id)
                  return (
                    <div key={payment.id} className="flex items-center justify-between gap-3 p-3 hover:bg-white/[0.03] transition-colors group">
                      <Link href={`/admin/projects/${payment.project.id}`} className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-white group-hover:text-violet-300 transition-colors truncate">{payment.project.name}</p>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-mono">
                          {payment.project.client.name || payment.project.client.email}
                          {" · "}
                          {PAYMENT_TYPE_LABELS[payment.type] ?? payment.type}
                          {" · "}
                          {formatDate(payment.createdAt)}
                        </p>
                      </Link>

                      <div className="flex items-center gap-2 shrink-0">
                        {payment.status === "PENDING" && (
                          <div className="flex gap-1.5">
                            <form action={markPaid}>
                              <button type="submit" className="h-6 px-2 text-[10px] font-mono font-bold rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors cursor-pointer">
                                Marquer payé
                              </button>
                            </form>
                            <form action={markCancelled}>
                              <button type="submit" className="h-6 px-2 text-[10px] font-mono rounded bg-white/5 hover:bg-white/10 text-zinc-400 transition-colors cursor-pointer">
                                Annuler
                              </button>
                            </form>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="font-bold text-xs text-white tabular-nums">{formatEUR(payment.amount)}</p>
                          <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded inline-block mt-0.5 ${PAYMENT_STATUS_COLORS[payment.status] ?? "bg-white/10 text-zinc-300"}`}>
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

        {/* Right (1/3 width) - Compliance & Gateway Info */}
        <div className="flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden justify-between space-y-4">
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <SparklesIcon className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                  Sécurité Encaissements & TVA
                </h2>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Toutes les factures et acomptes sont soumis aux normes fiscales belges (TVA 21% & enregistrement BCE).
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-400">Passerelle Mollie:</span>
                <span className="text-emerald-400 font-bold">Bancaire Sécurisé</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Bancontact & QR:</span>
                <span className="text-white font-bold">Actif (Wallonie)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Taux TVA appliqué:</span>
                <span className="text-cyan-400 font-bold">21% HTVA</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-white/5 bg-black/40 text-[10px] text-zinc-500 font-mono">
            Purity Finance Gateway 2026
          </div>
        </div>
      </div>
    </div>
  )
}
