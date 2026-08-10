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
    <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className={`text-sm font-bold tabular-nums w-9 text-center ${scoreColor(r.score)}`}>{r.score ?? "—"}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-white truncate text-sm">{r.companyName}</p>
          <StatusBadge status={r.status} />
          {!r.hasEmail && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">tél. uniquement</span>}
        </div>
        <p className="text-xs text-zinc-500 truncate mt-0.5">{r.location ?? "Localisation inconnue"} · {leadStatusLabel(r.status)}</p>
      </div>
      <a href={`tel:${r.phoneDial}`} className="text-sm font-mono text-emerald-300 hover:text-emerald-200 whitespace-nowrap shrink-0">📞 {r.phoneDisplay}</a>
      <CallSheetButton leadId={r.id} label="Fiche d'appel →" className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer" />
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
