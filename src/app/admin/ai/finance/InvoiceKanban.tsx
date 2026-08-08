"use client"

import { useMemo } from "react"

interface Invoice {
  id: string
  invoiceNumber: string
  clientName: string
  totalAmount: number
  status: string
  issuedAt: Date | null
  createdAt: Date
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(amount)
}

export function InvoiceKanban({ invoices }: { invoices: Invoice[] }) {
  // Grouper par statut (DRAFT, ISSUED, PAID, OVERDUE)
  const columns = useMemo(() => {
    const cols = {
      DRAFT: invoices.filter((i) => i.status === "DRAFT"),
      ISSUED: invoices.filter((i) => i.status === "ISSUED" || i.status === "PENDING"),
      OVERDUE: invoices.filter((i) => i.status === "OVERDUE"),
      PAID: invoices.filter((i) => i.status === "PAID"),
    }
    return cols
  }, [invoices])

  const Column = ({ title, status, items, colorClass, bgClass }: { title: string, status: string, items: Invoice[], colorClass: string, bgClass: string }) => (
    <div className="flex-1 min-w-[280px] bg-black/20 rounded-xl flex flex-col overflow-hidden border border-white/5">
      <div className={`p-3 border-b border-white/5 flex items-center justify-between ${bgClass}`}>
        <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${colorClass}`}>{title}</h3>
        <span className="text-[10px] font-mono text-white/50 bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
          {items.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {items.map((invoice) => (
          <div
            key={invoice.id}
            className="group relative p-3 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all hover:border-white/10"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-mono text-[10px] text-zinc-500">#{invoice.invoiceNumber}</span>
              <span className={`font-mono text-xs font-bold ${colorClass}`}>
                {formatCurrency(invoice.totalAmount)}
              </span>
            </div>
            <p className="text-sm font-semibold text-white truncate mb-2">{invoice.clientName}</p>
            
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
              <span className="text-[10px] text-zinc-500">
                {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : "Non émise"}
              </span>
              <button className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                Gérer →
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="h-20 flex items-center justify-center border border-dashed border-white/5 rounded-lg">
            <span className="text-xs text-zinc-600 font-mono">Vide</span>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-white/[0.01] border border-white/10 rounded-xl overflow-hidden">
      {/* Scrollable Container (Horizontal) */}
      <div className="flex-1 overflow-x-auto p-4 custom-scrollbar">
        <div className="flex h-full gap-4 min-w-max">
          <Column 
            title="Brouillons" 
            status="DRAFT" 
            items={columns.DRAFT} 
            colorClass="text-zinc-400" 
            bgClass="bg-zinc-500/5" 
          />
          <Column 
            title="Émises" 
            status="ISSUED" 
            items={columns.ISSUED} 
            colorClass="text-emerald-400" 
            bgClass="bg-emerald-500/5" 
          />
          <Column 
            title="En retard" 
            status="OVERDUE" 
            items={columns.OVERDUE} 
            colorClass="text-red-400" 
            bgClass="bg-red-500/5" 
          />
          <Column 
            title="Payées" 
            status="PAID" 
            items={columns.PAID} 
            colorClass="text-violet-400" 
            bgClass="bg-violet-500/5" 
          />
        </div>
      </div>
    </div>
  )
}
