import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { MailIcon } from "@/components/icons"
import { PageHeader } from "@/components/acquisition/PageHeader"

export const dynamic = "force-dynamic"

// Statut de livraison RÉEL (source Resend via webhook). "Envoyé" = accepté ;
// les autres statuts viennent des événements de livraison réels.
const DELIVERY: Record<string, { label: string; cls: string }> = {
  delivered: { label: "Délivré", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  sent: { label: "Envoyé", cls: "bg-[#212226] text-[#cbd0d8] border-[#2a2b30]" },
  delivery_delayed: { label: "Retardé", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  bounced: { label: "Rebond", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  complained: { label: "Spam", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
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
            { k: "En attente", v: summary.pending, c: "text-[#737884]" },
            { k: "Rebond/spam", v: summary.failed, c: summary.failed > 0 ? "text-red-400" : "text-[#737884]" },
            { k: "Ouverts", v: summary.opened, c: "text-[#6366f1]" },
            { k: "Clics", v: summary.clicked, c: "text-[#6366f1]" },
          ].map((x) => (
            <div key={x.k} className="rounded-xl border border-[#2a2b30] bg-[#1a1b1e] p-3">
              <div className={`text-2xl font-bold font-mono tabular-nums ${x.c}`}>{x.v}</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#737884] mt-0.5">{x.k}</div>
            </div>
          ))}
        </div>
      )}

      {sentEmails.length === 0 ? (
        <div className="flex-1 grid place-items-center">
          <div className="text-center border border-dashed border-[#2a2b30] rounded-2xl bg-[#212226] p-12">
            <MailIcon className="w-8 h-8 text-[#737884] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#737884]">Aucun email envoyé pour l&apos;instant.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 rounded-2xl border border-[#2a2b30] bg-[#1a1b1e] overflow-hidden flex flex-col">
          {/* Header table */}
          <div className="shrink-0 grid grid-cols-[minmax(0,1.6fr)_5.5rem_6rem_5rem] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_6rem_7rem_6rem] gap-3 px-4 py-2.5 border-b border-[#2a2b30] text-[10px] font-mono uppercase tracking-wider text-[#737884]">
            <span>Destinataire</span>
            <span className="hidden sm:block">Objet</span>
            <span>Livraison</span>
            <span className="text-center">Engagement</span>
            <span className="text-right">Date</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#242529]">
            {sentEmails.map((e) => (
              <details key={e.id} className="group">
                <summary className="grid grid-cols-[minmax(0,1.6fr)_5.5rem_6rem_5rem] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_6rem_7rem_6rem] gap-3 px-4 py-2.5 items-center cursor-pointer hover:bg-[#212226] transition-colors list-none">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#e8eaed] truncate">{e.lead.companyName}</div>
                    <div className="text-[10px] font-mono text-[#737884] truncate">{e.lead.contactEmail ?? "—"}</div>
                  </div>
                  <div className="hidden sm:block text-xs text-[#737884] truncate">{e.subject}</div>
                  <div><DeliveryBadge status={e.deliveryStatus} bounceReason={e.bounceReason} /></div>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono">
                    <span title="Ouvertures" className={e.openedAt ? "text-[#6366f1]" : "text-[#737884]"}>◉ {e.openCount}</span>
                    <span title="Clics" className={e.clickedAt ? "text-[#6366f1]" : "text-[#737884]"}>▲ {e.clickCount}</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#737884] text-right tabular-nums">
                    {e.updatedAt.toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </summary>
                <div className="px-4 pb-4 pt-1 border-t border-[#2a2b30] bg-[#212226]">
                  <div className="text-xs font-semibold text-[#e8eaed] mb-1.5">{e.subject}</div>
                  <div className="text-sm text-[#737884] prose prose-invert max-w-none prose-p:my-1 prose-a:text-[#6366f1]" dangerouslySetInnerHTML={{ __html: e.bodyHtml }} />
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
