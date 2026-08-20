import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { leadStatusLabel } from "@/lib/leadStatus"
import { CallSheetButton } from "@/app/admin/ai/acquisition/crm/[id]/CallSheetButton"
import { PageHeader } from "@/components/acquisition/PageHeader"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface Row {
  id: string
  companyName: string
  location: string | null
  status: string
  score: number
  band: "HOT" | "WARM"
  channel: string
  email: string | null
  phone: string | null
}

const BAND_ORDER = { HOT: 0, WARM: 1 } as const

function bandPill(band: "HOT" | "WARM") {
  return band === "HOT"
    ? "bg-[#7c3aed]/20 text-[#c4b5fd] border-[#7c3aed]/40"
    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
}
function scoreTone(s: number) {
  return s >= 70 ? "text-[#c4b5fd]" : s >= 40 ? "text-amber-300" : "text-[#94a3b8]"
}

function digits(phone: string): string {
  return phone.replace(/[^\d+]/g, "")
}

export default async function TodayPage() {
  await requireAdminSession()

  const leads = await prisma.lead.findMany({
    where: { optedOut: false, status: { notIn: ["MEETING_BOOKED"] } },
    select: { id: true, companyName: true, location: true, status: true, score: true, contactEmail: true, auditData: true },
  })

  const calls: Row[] = []
  const emails: Row[] = []
  for (const l of leads) {
    const a = (l.auditData ?? {}) as { priorityBand?: string; contactChannel?: string; contactPhone?: string }
    const band = a.priorityBand
    if (band !== "HOT" && band !== "WARM") continue
    const row: Row = {
      id: l.id, companyName: l.companyName, location: l.location, status: l.status,
      score: l.score ?? 0, band, channel: a.contactChannel ?? "NONE",
      email: l.contactEmail, phone: a.contactPhone ?? null,
    }
    if (a.contactChannel === "PHONE" && row.phone) calls.push(row)
    else if (a.contactChannel === "EMAIL") emails.push(row)
  }
  const sort = (arr: Row[]) => arr.sort((x, y) => BAND_ORDER[x.band] - BAND_ORDER[y.band] || y.score - x.score)
  sort(calls); sort(emails)
  const callList = calls.slice(0, 25)
  const emailList = emails.slice(0, 25)

  return (
    <div className="h-full flex flex-col p-4 lg:p-8 overflow-hidden bg-[#060309] text-[#f8fafc]">
      <PageHeader
        title="Aujourd'hui"
        subtitle="Tes actions du jour, triées par priorité. Appelle d'abord, mail ensuite — le téléphone est ton canal n°1."
        count={{ value: callList.length + emailList.length, label: "actions prioritaires", tone: "violet" }}
      />

      <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-4 custom-scrollbar">
        {/* File d'appels */}
        <Queue title="À appeler" subtitle="Ton meilleur canal — 56% de ta base" count={calls.length}>
          {callList.length === 0 ? <Empty /> : callList.map((r) => (
            <div key={r.id} className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] gap-3 items-center px-4 h-[54px] border-b border-white/5 last:border-0 hover:bg-[#1a1b1f] transition-colors group">
              <span className={`text-base font-bold font-mono tabular-nums ${scoreTone(r.score)}`}>{r.score}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[14px] font-semibold text-[#f8fafc] truncate">{r.companyName}</span>
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${bandPill(r.band)}`}>{r.band}</span>
                </div>
                <span className="block text-[12px] text-[#94a3b8] truncate">{r.location ?? "?"} · {leadStatusLabel(r.status)}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <CallSheetButton leadId={r.id} label="Fiche" className="hidden sm:inline-flex text-[12px] font-medium px-2.5 py-1.5 rounded-md border border-white/10 bg-[#0f1014] text-[#94a3b8] hover:text-[#f8fafc] transition-colors opacity-0 group-hover:opacity-100 focus-within:opacity-100" />
                <a href={`tel:${digits(r.phone!)}`} className="inline-flex items-center gap-1.5 text-[14px] font-mono tabular-nums font-medium text-[#cbd5e1] group-hover:text-[#c4b5fd] whitespace-nowrap transition-colors">
                  <span aria-hidden>📞</span>{r.phone}
                </a>
              </div>
            </div>
          ))}
        </Queue>

        {/* File d'emails */}
        <Queue title="À emailer" subtitle="Décideurs joignables par email nominatif" count={emails.length}>
          {emailList.length === 0 ? <Empty /> : emailList.map((r) => (
            <Link key={r.id} href={`/admin/ai/acquisition/crm/${r.id}`} className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] gap-3 items-center px-4 h-[54px] border-b border-white/5 last:border-0 hover:bg-[#1a1b1f] transition-colors group">
              <span className={`text-base font-bold font-mono tabular-nums ${scoreTone(r.score)}`}>{r.score}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[14px] font-semibold text-[#f8fafc] truncate group-hover:text-[#c4b5fd] transition-colors">{r.companyName}</span>
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${bandPill(r.band)}`}>{r.band}</span>
                </div>
                <span className="block text-[12px] font-mono text-[#94a3b8] truncate">{r.email ?? "—"}</span>
              </div>
              <span className="text-[12px] text-[#64748b] group-hover:text-[#94a3b8] whitespace-nowrap shrink-0">Fiche →</span>
            </Link>
          ))}
        </Queue>
      </div>
    </div>
  )
}

function Queue({ title, subtitle, count, children }: { title: string; subtitle: string; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0f1014] overflow-hidden flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-2 px-5 h-12 bg-[#09090c] border-b border-white/5 shrink-0">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#f8fafc]">{title}</h2>
        <span className="text-[12px] font-mono tabular-nums text-[#7c3aed]">{count}</span>
        <span className="ml-auto text-[11px] text-[#64748b]">{subtitle}</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">{children}</div>
    </div>
  )
}

function Empty() {
  return <p className="text-sm text-[#64748b] italic px-4 py-10 text-center">Rien de prioritaire ici pour l&apos;instant.</p>
}
