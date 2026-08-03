import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import Link from "next/link"
import { formatEUR, formatDate } from "@/lib/adminFormat"

export default async function AdminFinancePage() {
  await requireAdminSession()

  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { project: { select: { id: true, name: true } } },
  })

  const draftTotal = invoices.filter((i) => i.status === "DRAFT").reduce((s, i) => s + i.totalAmount, 0)
  const issuedTotal = invoices.filter((i) => i.status !== "DRAFT").reduce((s, i) => s + i.totalAmount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Finance (Pôle 02)</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Nathalie Coppens (Chief Finance AI) — Bruno Dechamps (Invoice Agent) est le seul agent codé de ce pôle. Les factures se génèrent depuis la fiche projet.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs text-zinc-500">Brouillons</p>
          <p className="text-2xl font-bold text-white mt-1 tabular-nums">{formatEUR(draftTotal)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs text-zinc-500">Émises</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">{formatEUR(issuedTotal)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {invoices.length === 0 ? (
          <p className="p-6 text-sm text-zinc-400">Aucune facture générée pour l&apos;instant.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/admin/projects/${invoice.project.id}`}
                className="flex items-center justify-between gap-4 p-5 hover:bg-white/5 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{invoice.invoiceNumber} — {invoice.project.name}</p>
                  <p className="text-xs text-zinc-400 truncate">{invoice.clientName} · {formatDate(invoice.createdAt)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-white tabular-nums">{formatEUR(invoice.totalAmount)}</p>
                  <span className="text-[11px] px-2 py-0.5 rounded inline-block mt-1 bg-white/10 text-zinc-300">
                    {invoice.status === "DRAFT" ? "Brouillon" : invoice.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
