import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { cleanBelgianPhone } from "@/lib/acquisition/phone"
import { StatusBadge } from "@/components/StatusBadge"
import { leadStatusLabel } from "@/lib/leadStatus"
import { CallSheetButton } from "@/app/admin/ai/acquisition/crm/[id]/CallSheetButton"
import { PageHeader } from "@/components/acquisition/PageHeader"

export const dynamic = "force-dynamic"

interface Row {
  id: string
  companyName: string
  location: string | null
  status: string
  score: number | null
  hasEmail: boolean
  phoneDisplay: string
  phoneDial: string
}

function scoreColor(s: number | null) {
  if (s === null) return "text-zinc-600"
  return s >= 70 ? "text-emerald-400" : s >= 40 ? "text-amber-400" : "text-zinc-400"
}

function CallRow({ r }: { r: Row }) {
  return (
    <div className="grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[2.5rem_minmax(0,1fr)_auto_auto] gap-3 items-center px-3 py-2.5 rounded-xl border border-white/[0.06] bg-[#141416] hover:border-white/[0.14] transition-colors">
      <div className={`text-lg font-bold font-mono tabular-nums text-center ${scoreColor(r.score)}`}>{r.score ?? "—"}</div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-white truncate text-sm">{r.companyName}</p>
          {!r.hasEmail && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">seul canal</span>}
        </div>
        <p className="text-[11px] text-[#7a7a72] truncate mt-0.5">{r.location ?? "?"} · {leadStatusLabel(r.status)}</p>
      </div>
      <CallSheetButton leadId={r.id} label="Fiche →" className="hidden sm:inline-flex text-[11px] font-mono px-2.5 py-2 rounded-lg border border-[#c4f82a]/30 bg-[#c4f82a]/10 text-[#c4f82a] hover:bg-[#c4f82a]/18 transition-colors whitespace-nowrap cursor-pointer" />
      <a href={`tel:${r.phoneDial}`} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors whitespace-nowrap shrink-0">
        <span aria-hidden>📞</span><span className="font-mono">{r.phoneDisplay}</span>
      </a>
    </div>
  )
}

export default async function CallsPage() {
  await requireAdminSession()

  // Leads non désinscrits, pas encore en RDV, avec un numéro dans l'audit.
  const leads = await prisma.lead.findMany({
    where: { optedOut: false, status: { notIn: ["MEETING_BOOKED"] } },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    select: { id: true, companyName: true, location: true, status: true, score: true, contactEmail: true, auditData: true },
  })

  const rows: Row[] = []
  for (const l of leads) {
    const rawPhone = (l.auditData as { contactPhone?: string } | null)?.contactPhone
    const clean = cleanBelgianPhone(rawPhone)
    if (!clean) continue
    rows.push({
      id: l.id,
      companyName: l.companyName,
      location: l.location,
      status: l.status,
      score: l.score,
      hasEmail: !!l.contactEmail,
      phoneDisplay: clean.display,
      phoneDial: clean.dial,
    })
  }

  // Priorité : ceux dont l'appel est le SEUL canal (pas d'email), puis les autres.
  const phoneOnly = rows.filter((r) => !r.hasEmail)
  const alsoEmail = rows.filter((r) => r.hasEmail)

  return (
    <div className="h-full flex flex-col p-4 lg:p-8 overflow-hidden">
      <PageHeader
        title="Canal d'appel"
        subtitle="Leads joignables par téléphone, triés par score. Priorité à ceux sans email."
        count={{ value: rows.length, label: "à appeler", tone: "emerald" }}
      />

      <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
        {rows.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
            <p className="text-sm font-semibold text-zinc-300">Aucun lead avec un numéro valide pour l&apos;instant.</p>
          </div>
        ) : (
          <>
            <section>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono">Prioritaire — l&apos;appel est le seul canal</h2>
                <span className="text-[10px] font-mono text-zinc-500">{phoneOnly.length}</span>
              </div>
              <div className="space-y-2">
                {phoneOnly.length === 0 ? <p className="text-xs text-zinc-500 italic">Aucun.</p> : phoneOnly.map((r) => <CallRow key={r.id} r={r} />)}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">Aussi joignables par téléphone</h2>
                <span className="text-[10px] font-mono text-zinc-500">{alsoEmail.length}</span>
              </div>
              <div className="space-y-2">
                {alsoEmail.length === 0 ? <p className="text-xs text-zinc-500 italic">Aucun.</p> : alsoEmail.map((r) => <CallRow key={r.id} r={r} />)}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
