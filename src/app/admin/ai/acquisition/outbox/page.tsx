import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { MailIcon } from "@/components/icons"
import { PageHeader } from "@/components/acquisition/PageHeader"

export const dynamic = "force-dynamic"

// Statut de livraison RÉEL (source Resend via webhook). "Envoyé" = accepté ;
// les autres statuts viennent des événements de livraison réels.
const DELIVERY: Record<string, { label: string; cls: string }> = {
  delivered: { label: "Délivré", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25" },
  sent: { label: "Envoyé", cls: "bg-white/5 text-zinc-300 border-white/15" },
  delivery_delayed: { label: "Retardé", cls: "bg-amber-500/10 text-amber-300 border-amber-500/25" },
  bounced: { label: "Rebond", cls: "bg-red-500/10 text-red-300 border-red-500/25" },
  complained: { label: "Spam", cls: "bg-red-500/10 text-red-300 border-red-500/25" },
}

function DeliveryBadge({ status, bounceReason }: { status: string | null; bounceReason: string | null }) {
  const s = DELIVERY[status ?? "sent"] ?? DELIVERY.sent
  return <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${s.cls}`} title={bounceReason ?? undefined}>{s.label}</span>
}

export default async function AcquisitionOutboxPage() {
  await requireAdminSession()

  const sentEmails = await prisma.emailDraft.findMany({
    where: { status: "SENT" },
    include: { lead: { select: { companyName: true, contactEmail: true } } },
    orderBy: { updatedAt: "desc" },
  })

  const summary = sentEmails.reduce(
    (a, e) => {
      const s = e.deliveryStatus ?? "sent"
      if (s === "delivered") a.delivered++
      else if (s === "bounced" || s === "complained") a.failed++
      else a.pending++
      if (e.openedAt) a.opened++
      if (e.clickedAt) a.clicked++
      return a
    },
    { delivered: 0, failed: 0, pending: 0, opened: 0, clicked: 0 },
  )

  return (
    <div className="h-full flex flex-col p-4 lg:p-8 overflow-hidden">
      <PageHeader
        title="Emails envoyés"
        subtitle="Livraison réelle (Resend) + ouverture et clic par email."
        count={{ value: sentEmails.length, label: "envoyés", tone: "emerald" }}
      />

      {sentEmails.length > 0 && (
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
          {[
            { k: "Délivrés", v: summary.delivered, c: "text-emerald-400" },
            { k: "En attente", v: summary.pending, c: "text-[#c9c9c2]" },
            { k: "Rebond/spam", v: summary.failed, c: summary.failed > 0 ? "text-red-400" : "text-[#5a5a54]" },
            { k: "Ouverts", v: summary.opened, c: "text-[#c4f82a]" },
            { k: "Clics", v: summary.clicked, c: "text-[#c4f82a]" },
          ].map((x) => (
            <div key={x.k} className="rounded-xl border border-white/[0.07] bg-[#141416] p-3">
              <div className={`text-2xl font-bold font-mono tabular-nums ${x.c}`}>{x.v}</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#7a7a72] mt-0.5">{x.k}</div>
            </div>
          ))}
        </div>
      )}

      {sentEmails.length === 0 ? (
        <div className="flex-1 grid place-items-center">
          <div className="text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01] p-12">
            <MailIcon className="w-8 h-8 text-[#5a5a54] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#c9c9c2]">Aucun email envoyé pour l&apos;instant.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 rounded-2xl border border-white/[0.07] bg-[#141416] overflow-hidden flex flex-col">
          {/* Header table */}
          <div className="shrink-0 grid grid-cols-[minmax(0,1.6fr)_5.5rem_6rem_5rem] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_6rem_7rem_6rem] gap-3 px-4 py-2.5 border-b border-white/[0.07] text-[10px] font-mono uppercase tracking-wider text-[#7a7a72]">
            <span>Destinataire</span>
            <span className="hidden sm:block">Objet</span>
            <span>Livraison</span>
            <span className="text-center">Engagement</span>
            <span className="text-right">Date</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/[0.04]">
            {sentEmails.map((e) => (
              <details key={e.id} className="group">
                <summary className="grid grid-cols-[minmax(0,1.6fr)_5.5rem_6rem_5rem] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_6rem_7rem_6rem] gap-3 px-4 py-2.5 items-center cursor-pointer hover:bg-white/[0.03] transition-colors list-none">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{e.lead.companyName}</div>
                    <div className="text-[10px] font-mono text-[#5a5a54] truncate">{e.lead.contactEmail ?? "—"}</div>
                  </div>
                  <div className="hidden sm:block text-xs text-[#c9c9c2] truncate">{e.subject}</div>
                  <div><DeliveryBadge status={e.deliveryStatus} bounceReason={e.bounceReason} /></div>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono">
                    <span title="Ouvertures" className={e.openedAt ? "text-[#c4f82a]" : "text-[#3a3a36]"}>◉ {e.openCount}</span>
                    <span title="Clics" className={e.clickedAt ? "text-[#c4f82a]" : "text-[#3a3a36]"}>▲ {e.clickCount}</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#7a7a72] text-right tabular-nums">
                    {e.updatedAt.toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </summary>
                <div className="px-4 pb-4 pt-1 border-t border-white/[0.04] bg-black/20">
                  <div className="text-xs font-semibold text-white mb-1.5">{e.subject}</div>
                  <div className="text-sm text-[#c9c9c2] prose prose-invert max-w-none prose-p:my-1 prose-a:text-[#c4f82a]" dangerouslySetInnerHTML={{ __html: e.bodyHtml }} />
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
