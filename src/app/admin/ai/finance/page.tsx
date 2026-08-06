import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { FinanceIcon } from "@/components/icons"
import { InvoiceKanban } from "./InvoiceKanban"
import { FinanceAgentFeed } from "./FinanceAgentFeed"

export default async function AdminAiFinancePage() {
  await requireAdminSession()

  // Fetch Invoices
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  // Fetch Agents for Finance (02_FINANCE)
  const financeAgents = await prisma.agentActivity.findMany({
    where: { department: "02_FINANCE" },
    orderBy: { updatedAt: "desc" },
  })

  // KPI Calculations
  const draftCount = invoices.filter(i => i.status === "DRAFT").length
  const pendingCount = invoices.filter(i => i.status === "ISSUED" || i.status === "PENDING").length
  const overdueCount = invoices.filter(i => i.status === "OVERDUE").length
  const pendingAmount = invoices
    .filter(i => i.status === "ISSUED" || i.status === "PENDING" || i.status === "OVERDUE")
    .reduce((sum, i) => sum + i.totalAmount, 0)
    
  const activeAgentsCount = financeAgents.filter(a => a.status === "WORKING").length

  return (
    <div className="h-[calc(100vh-90px)] flex flex-col space-y-4 overflow-hidden bg-[#060309]">
      {/* Top Header & Compact KPI Bar */}
      <div className="shrink-0 space-y-3 border-b border-white/5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Finance & Administration · Pôle 02</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
              <FinanceIcon className="w-6 h-6 text-emerald-400" />
              <span>Pilotage IA Finance</span>
            </h1>
          </div>
        </div>

        {/* KPI Ribbon Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-500/70 block truncate">Agents Actifs</span>
            <span className="text-base font-bold text-emerald-400 tabular-nums">{activeAgentsCount}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Cash en Attente</span>
            <span className="text-base font-bold text-white tabular-nums">{pendingAmount.toLocaleString('fr-BE')} €</span>
          </div>
          <div className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-red-500/70 block truncate">Factures en Retard</span>
            <span className="text-base font-bold text-red-400 tabular-nums">{overdueCount}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Brouillons à Valider</span>
            <span className="text-base font-bold text-white tabular-nums">{draftCount}</span>
          </div>
        </div>
      </div>

      {/* Main Fit-To-Screen Content Grid (75/25) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0 overflow-hidden">
        {/* Left (75% width) - Invoice Kanban */}
        <div className="lg:col-span-3 min-h-0 relative">
          <InvoiceKanban invoices={invoices} />
        </div>

        {/* Right (25% width) - Agent Activity Feed */}
        <div className="min-h-0 relative">
          <FinanceAgentFeed agents={financeAgents} />
        </div>
      </div>
    </div>
  )
}
