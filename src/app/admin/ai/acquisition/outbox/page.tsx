import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { MailIcon } from "@/components/icons"
import { PageHeader } from "@/components/acquisition/PageHeader"

// Badge de livraison RÉELLE (source Resend via webhook). "Envoyé" = accepté par
// Resend ; les autres statuts viennent des événements de livraison réels.
const DELIVERY: Record<string, { label: string; cls: string }> = {
  delivered: { label: "Délivré", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25" },
  sent: { label: "Envoyé", cls: "bg-white/5 text-zinc-300 border-white/15" },
  delivery_delayed: { label: "Retardé", cls: "bg-amber-500/10 text-amber-300 border-amber-500/25" },
  bounced: { label: "Rebond", cls: "bg-red-500/10 text-red-300 border-red-500/25" },
  complained: { label: "Spam", cls: "bg-red-500/10 text-red-300 border-red-500/25" },
}

function DeliveryBadge({ status, bounceReason }: { status: string | null; bounceReason: string | null }) {
  const s = DELIVERY[status ?? "sent"] ?? DELIVERY.sent
  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${s.cls}`} title={bounceReason ?? undefined}>
      {s.label}
    </span>
  )
}

export default async function AcquisitionOutboxPage() {
  await requireAdminSession()

  // Fetch sent emails
  const sentEmails = await prisma.emailDraft.findMany({
    where: { status: "SENT" },
    include: { lead: true },
    orderBy: { updatedAt: "desc" }
  })

  // Résumé de délivrabilité (chiffres réels).
  const summary = sentEmails.reduce(
    (a, e) => {
      const s = e.deliveryStatus ?? "sent"
      if (s === "delivered") a.delivered++
      else if (s === "bounced" || s === "complained") a.failed++
      else a.pending++
      if (e.openedAt) a.opened++
      return a
    },
    { delivered: 0, failed: 0, pending: 0, opened: 0 },
  )

  return (
    <div className="h-full flex flex-col p-4 lg:p-8 overflow-hidden">
      <PageHeader
        title="Emails envoyés"
        subtitle="Livraison réelle (Resend) + suivi d'ouverture et de clic."
        count={{ value: sentEmails.length, label: "envoyés", tone: "emerald" }}
      />

      {/* Résumé délivrabilité — chiffres réels */}
      {sentEmails.length > 0 && (
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            { k: "Délivrés", v: summary.delivered, c: "text-emerald-400" },
            { k: "En attente confirmation", v: summary.pending, c: "text-zinc-300" },
            { k: "Rebonds / spam", v: summary.failed, c: summary.failed > 0 ? "text-red-400" : "text-zinc-500" },
            { k: "Ouverts", v: summary.opened, c: "text-emerald-400" },
          ].map((x) => (
            <div key={x.k} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <div className={`text-2xl font-bold font-mono tabular-nums ${x.c}`}>{x.v}</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mt-0.5">{x.k}</div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
        {sentEmails.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01] flex flex-col items-center">
            <MailIcon className="w-8 h-8 text-zinc-600 mb-3" />
            <p className="text-sm font-semibold text-zinc-300">Aucun email n&apos;a encore été envoyé.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sentEmails.map((email) => (
              <div key={email.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-white/[0.04] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <DeliveryBadge status={email.deliveryStatus} bounceReason={email.bounceReason} />
                    <span className="text-xs text-zinc-500 font-mono">
                      {email.updatedAt.toLocaleDateString("fr-BE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${email.openedAt ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-white/5 text-zinc-500 border-white/10"}`}>
                      {email.openedAt ? `Ouvert ×${email.openCount}` : "Non ouvert"}
                    </span>
                    {email.clickedAt && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-[#c4f82a]/10 text-[#c4f82a] border-[#c4f82a]/25">
                        Clic ×{email.clickCount}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white truncate">{email.subject}</h3>
                  <p className="text-xs text-zinc-400 truncate mt-1">À : {email.lead.contactEmail || email.lead.companyName}</p>
                </div>
                
                <details className="w-full sm:w-auto mt-2 sm:mt-0 group shrink-0">
                  <summary className="cursor-pointer text-xs font-semibold text-zinc-300 hover:text-white bg-white/5 px-3 py-2 rounded-lg border border-white/10 transition-colors list-none text-center">
                    Voir le contenu ↓
                  </summary>
                  <div className="absolute right-4 left-4 sm:left-auto sm:w-[500px] mt-2 p-4 bg-[#141416] border border-white/10 rounded-xl shadow-2xl z-50 max-h-[60vh] overflow-y-auto custom-scrollbar">
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
