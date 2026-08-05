import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import Link from "next/link"
import { formatEUR, formatDate } from "@/lib/adminFormat"
import { FinanceIcon, PaymentsIcon, DocumentsIcon, SparklesIcon } from "@/components/icons"

export default async function AdminFinancePage() {
  await requireAdminSession()

  const [invoices, payments, projects] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: { project: { select: { id: true, name: true, client: { select: { name: true, email: true } } } } },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      include: { project: { select: { id: true, name: true, client: { select: { name: true, email: true } } } } },
    }),
    prisma.project.findMany({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] }, monthlyAmount: { not: null } },
      select: { monthlyAmount: true },
    }),
  ])

  const draftTotal = invoices.filter((i) => i.status === "DRAFT").reduce((s, i) => s + i.totalAmount, 0)
  const issuedTotal = invoices.filter((i) => i.status !== "DRAFT").reduce((s, i) => s + i.totalAmount, 0)

  const paidTotal = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0)
  const pendingTotal = payments.filter((p) => p.status === "PENDING").reduce((s, p) => s + p.amount, 0)

  const monthlyMRR = projects.reduce((s, p) => s + (p.monthlyAmount ?? 0), 0)
  const estimatedSubsidies = Math.round((paidTotal + pendingTotal) * 0.5) // Chèques Entreprises 50%

  return (
    <div className="h-[calc(100vh-90px)] flex flex-col space-y-4 overflow-hidden">
      {/* Header Compact */}
      <div className="shrink-0 space-y-3 border-b border-white/5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Finance & Administration · Pôle 02</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
              <FinanceIcon className="w-6 h-6 text-emerald-400" />
              <span>Console Financière & Subventions</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/admin/export/payments"
              download
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors shrink-0"
            >
              ↓ Export Compta CSV
            </a>
          </div>
        </div>

        {/* KPI Ribbon Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Total Encaissé</span>
            <span className="text-base font-bold text-emerald-400 tabular-nums">{formatEUR(paidTotal)}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">À Encaisser</span>
            <span className="text-base font-bold text-amber-400 tabular-nums">{formatEUR(pendingTotal)}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">MRR Mensuel</span>
            <span className="text-base font-bold text-violet-400 tabular-nums">{formatEUR(monthlyMRR)}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Factures Émises</span>
            <span className="text-base font-bold text-white tabular-nums">{formatEUR(issuedTotal)}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Potentiel Subventions SPW</span>
            <span className="text-base font-bold text-cyan-400 tabular-nums">~{formatEUR(estimatedSubsidies)}</span>
          </div>
        </div>
      </div>

      {/* Main Fit-To-Screen Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 overflow-hidden">
        {/* Left (2/3 width) - Invoices & Payments Table */}
        <div className="lg:col-span-2 flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <PaymentsIcon className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Journal des Factures & Encaissements</h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">{invoices.length} facture(s)</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {invoices.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
                <DocumentsIcon className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400">Aucune facture enregistrée pour l&apos;instant.</p>
                <p className="text-[10px] text-zinc-600 mt-1">Les factures se génèrent directement depuis la fiche d&apos;un projet client.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/admin/projects/${invoice.project.id}`}
                    className="flex items-center justify-between gap-4 p-3 hover:bg-white/[0.03] transition-colors rounded-lg group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
                          {invoice.invoiceNumber || "Brouillon"}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 truncate">
                          · {invoice.project.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        Client: {invoice.clientName} · Créée le {formatDate(invoice.createdAt)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-bold text-xs text-white tabular-nums">{formatEUR(invoice.totalAmount)}</p>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded inline-block mt-1 ${
                        invoice.status === "PAID" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/10 text-zinc-400"
                      }`}>
                        {invoice.status === "DRAFT" ? "Brouillon" : invoice.status === "PAID" ? "Payée" : invoice.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right (1/3 width) - Chèques Entreprises SPW & Financial Forecast */}
        <div className="flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden justify-between space-y-4">
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <SparklesIcon className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                  Chèques Entreprises Wallonie (SPW)
                </h2>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Les PME et indépendants wallons peuvent bénéficier de **50 % de prise en charge HTVA** (SPW Économie) sur leurs projets de numérisation & automatisations IA chez Purity Agency.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Plafond par entreprise</span>
                <span className="font-bold text-white font-mono">50 000 € / 3 ans</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Taux de subvention</span>
                <span className="font-bold text-cyan-400 font-mono">50% HTVA</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Accompagnement Purity</span>
                <span className="font-bold text-emerald-400 font-mono">100% Géré</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5">
              <h3 className="text-xs font-bold text-white font-mono uppercase">Prévisionnel Trésorerie 6 Mois</h3>
              <div className="space-y-1.5 text-xs text-zinc-400 font-mono">
                <div className="flex justify-between">
                  <span>MRR contractuel annuel:</span>
                  <span className="text-white font-bold">{formatEUR(monthlyMRR * 12)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Encaissements futurs en attente:</span>
                  <span className="text-amber-400 font-bold">{formatEUR(pendingTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-white/5 bg-black/40 text-[10px] text-zinc-500 font-mono">
            Nathalie Coppens (Chief Finance AI) & Bruno Dechamps (Invoice Agent)
          </div>
        </div>
      </div>
    </div>
  )
}
