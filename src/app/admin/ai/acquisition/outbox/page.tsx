import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import Link from "next/link"
import { MailIcon } from "@/components/icons"
import { AcquisitionNav } from "../AcquisitionNav"

export default async function AcquisitionOutboxPage() {
  await requireAdminSession()

  // Fetch sent emails
  const sentEmails = await prisma.emailDraft.findMany({
    where: { status: "SENT" },
    include: { lead: true },
    orderBy: { updatedAt: "desc" }
  })

  return (
    <div className="h-full flex flex-col p-4 bg-[#060309] overflow-hidden">
      <AcquisitionNav />
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <MailIcon className="w-5 h-5 text-emerald-500" />
              Historique des Envois
            </h1>
            <p className="text-xs text-zinc-400">
              Liste de tous les emails expédiés par le RevOps Automator.
            </p>
          </div>
        </div>
        <div className="text-xs font-mono px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
          {sentEmails.length} envoyé(s)
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
        {sentEmails.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01] flex flex-col items-center">
            <MailIcon className="w-8 h-8 text-zinc-600 mb-3" />
            <p className="text-sm font-semibold text-zinc-300">Aucun email n'a encore été envoyé.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sentEmails.map((email) => (
              <div key={email.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-white/[0.04] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">SENT</span>
                    <span className="text-xs text-zinc-500 font-mono">
                      {email.updatedAt.toLocaleDateString("fr-BE", { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white truncate">{email.subject}</h3>
                  <p className="text-xs text-zinc-400 truncate mt-1">À: {email.lead.contactEmail || email.lead.companyName}</p>
                </div>
                
                <details className="w-full sm:w-auto mt-2 sm:mt-0 group shrink-0">
                  <summary className="cursor-pointer text-xs font-semibold text-zinc-300 hover:text-white bg-white/5 px-3 py-2 rounded-lg border border-white/10 transition-colors list-none text-center">
                    Voir le contenu ↓
                  </summary>
                  <div className="absolute right-4 left-4 sm:left-auto sm:w-[500px] mt-2 p-4 bg-[#0a0510] border border-white/10 rounded-xl shadow-2xl z-50 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div 
                      className="text-sm text-zinc-300 prose prose-invert max-w-none prose-p:my-1 prose-a:text-emerald-400"
                      dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                    />
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
