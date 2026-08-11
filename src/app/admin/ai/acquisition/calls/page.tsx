import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { cleanBelgianPhone } from "@/lib/acquisition/phone"
import { leadStatusLabel } from "@/lib/leadStatus"
import { CallSheetButton } from "@/app/admin/ai/acquisition/crm/[id]/CallSheetButton"
import { PageHeader } from "@/components/acquisition/PageHeader"
import { scoreTone, scoreBar } from "@/components/acquisition/theme"

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

// Une ligne d'appel : dense (~44px), hiérarchie par la typo, couleur réservée
// au score. Le téléphone est un lien mono discret ; l'action « Fiche » n'apparaît
// qu'au survol pour garder la ligne calme (réf. Linear / Attio).
function CallRow({ r }: { r: Row }) {
  return (
    <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] gap-4 items-center px-5 h-[58px] border-b border-[#242529] last:border-0 hover:bg-[#212226] transition-colors group">
      {/* Score + barre fine */}
      <div className="flex flex-col gap-1.5">
        <span className={`text-lg font-bold font-mono tabular-nums leading-none ${scoreTone(r.score)}`}>{r.score ?? "—"}</span>
        <span className="h-[3px] w-9 rounded-full bg-[#242529] overflow-hidden">
          <span className={`block h-full rounded-full ${scoreBar(r.score)}`} style={{ width: `${Math.min(100, r.score ?? 0)}%` }} />
        </span>
      </div>

      {/* Entreprise + méta inline */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[15px] font-semibold text-[#e8eaed] truncate">{r.companyName}</span>
          {!r.hasEmail && (
            <span className="shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">seul canal</span>
          )}
        </div>
        <span className="block text-[13px] text-[#a3a9b4] truncate leading-tight mt-0.5">
          {r.location ?? "?"} · {leadStatusLabel(r.status)}
        </span>
      </div>

      {/* Cluster droit : Fiche (au survol) + téléphone (toujours) */}
      <div className="flex items-center gap-4 shrink-0">
        <CallSheetButton
          leadId={r.id}
          label="Fiche"
          className="hidden sm:inline-flex text-[13px] font-medium px-3 py-1.5 rounded-md border border-[#2a2b30] bg-[#1a1b1e] text-[#a3a9b4] hover:text-[#e8eaed] hover:border-[#737884] transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus-within:opacity-100"
        />
        <a
          href={`tel:${r.phoneDial}`}
          className="inline-flex items-center gap-2 text-[15px] font-mono tabular-nums font-medium text-[#cbd0d8] group-hover:text-[#6366f1] whitespace-nowrap transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4 text-[#737884] group-hover:text-[#6366f1] transition-colors" fill="currentColor"><path d="M3.6 2h2.2l1 2.6-1.4 1a8 8 0 0 0 3 3l1-1.4 2.6 1V13c0 .6-.5 1-1 1A11 11 0 0 1 2.6 3c0-.6.4-1 1-1z"/></svg>
          {r.phoneDisplay}
        </a>
      </div>
    </div>
  )
}

function Section({ title, count, rows, muted }: { title: string; count: number; rows: Row[]; muted?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#2a2b30] bg-[#1a1b1e] overflow-hidden shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center gap-2 px-5 h-11 bg-[#212226] border-b border-[#2a2b30]">
        <h2 className={`text-[12px] font-bold uppercase tracking-wider ${muted ? "text-[#a3a9b4]" : "text-[#fbbf24]"}`}>{title}</h2>
        <span className="text-[12px] font-mono tabular-nums text-[#737884]">{count}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-[#737884] italic px-4 py-6 text-center">Aucun.</p>
      ) : (
        rows.map((r) => <CallRow key={r.id} r={r} />)
      )}
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

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
        {rows.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-[#2a2b30] rounded-xl bg-[#212226]">
            <p className="text-sm font-semibold text-[#cbd0d8]">Aucun lead avec un numéro valide pour l&apos;instant.</p>
          </div>
        ) : (
          <>
            <Section title="Prioritaire — l'appel est le seul canal" count={phoneOnly.length} rows={phoneOnly} />
            <Section title="Aussi joignables par téléphone" count={alsoEmail.length} rows={alsoEmail} muted />
          </>
        )}
      </div>
    </div>
  )
}
