import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const project = await prisma.project.findFirst({
    where: { clientId: session.user.id },
    include: {
      payments: { orderBy: { createdAt: "desc" } }
    }
  })

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          Facturation & Règlement
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Historique des transactions, acomptes et récapitulatif proforma.</p>
      </div>

      {!project ? (
        <div className="p-8 border border-white/5 bg-[#060309]/50 rounded-2xl text-center">
          <p className="text-zinc-500 text-sm">Aucun projet actif rattaché à ce compte.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl glass-panel border border-white/5">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Acompte Initial</span>
              <div className="text-2xl font-bold text-white mt-1">
                {project.depositAmount ? `${project.depositAmount} €` : "En attente"}
              </div>
              <span className="text-xs text-emerald-400 mt-1 block">Règlement sécurisé Mollie</span>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-white/5">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Abonnement Mensuel</span>
              <div className="text-2xl font-bold text-purple-400 mt-1">
                {project.monthlyAmount ? `${project.monthlyAmount} € / mois` : "Aucun"}
              </div>
              <span className="text-xs text-zinc-400 mt-1 block">Hébergement & Maintenance</span>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-white/5">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Franchise TVA</span>
              <div className="text-2xl font-bold text-white mt-1">
                Art. 56bis
              </div>
              <span className="text-xs text-zinc-400 mt-1 block">TVA non applicable</span>
            </div>
          </div>

          {/* Transactions List */}
          <div className="p-6 rounded-2xl glass-panel space-y-4">
            <h2 className="font-bold text-white text-base">Historique des Transactions</h2>

            {project.payments.length === 0 ? (
              <p className="text-sm text-zinc-500 italic py-4">Aucune transaction enregistrée pour l&apos;instant.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {project.payments.map((p) => (
                  <div key={p.id} className="py-3.5 flex justify-between items-center text-sm">
                    <div>
                      <div className="font-semibold text-white">{p.type || "Paiement commande"}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {new Date(p.createdAt).toLocaleDateString("fr-FR")} — Ref: {p.id.substring(0, 8)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-white">{p.amount} €</div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        p.status === "PAID" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
