"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { usePathname, useSearchParams } from "next/navigation"
import { LEAD_STATUS_ORDER, leadStatusLabel } from "@/lib/leadStatus"
import { StatusBadge } from "@/components/StatusBadge"

export interface LeadRow {
  id: string
  companyName: string
  contactName: string | null
  contactEmail: string | null
  location: string | null
  status: string
  score: number | null
  hasSite: boolean
  hasPhone: boolean
  createdAt: string
}

type SortKey = "score" | "companyName" | "status" | "createdAt"

function scoreColor(s: number | null) {
  if (s === null) return "text-zinc-600"
  return s >= 70 ? "text-[#c4f82a]" : s >= 40 ? "text-amber-400" : "text-zinc-400"
}

// Micro-jauge de score (barre fine), plus lisible qu'un nombre nu.
function ScoreCell({ s }: { s: number | null }) {
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="hidden sm:block w-14 h-1 rounded-full bg-white/[0.07] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${s ?? 0}%`, background: s === null ? "#3a3a36" : s >= 70 ? "#c4f82a" : s >= 40 ? "#f59e0b" : "#6b6b64" }} />
      </div>
      <span className={`text-sm font-bold font-mono tabular-nums w-8 text-right ${scoreColor(s)}`}>{s ?? "—"}</span>
    </div>
  )
}

export function LeadsExplorer({ initialLeads }: { initialLeads: LeadRow[] }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "ALL")
  const [minScore, setMinScore] = useState<number | "">(searchParams.get("min") ? Number(searchParams.get("min")) : "")
  const [sortKey, setSortKey] = useState<SortKey>("score")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    const p = new URLSearchParams()
    if (search) p.set("q", search)
    if (statusFilter !== "ALL") p.set("status", statusFilter)
    if (minScore !== "") p.set("min", String(minScore))
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [search, statusFilter, minScore, pathname, router])

  const rows = useMemo(() => {
    const q = search.toLowerCase()
    const filtered = initialLeads.filter((l) => {
      const matchSearch = !q || l.companyName.toLowerCase().includes(q) || (l.contactEmail || "").toLowerCase().includes(q) || (l.location || "").toLowerCase().includes(q) || (l.contactName || "").toLowerCase().includes(q)
      const matchStatus = statusFilter === "ALL" || l.status === statusFilter
      const matchScore = minScore === "" || (l.score !== null && l.score >= Number(minScore))
      return matchSearch && matchStatus && matchScore
    })
    const dir = sortDir === "asc" ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sortKey === "score") return ((a.score ?? -1) - (b.score ?? -1)) * dir
      if (sortKey === "companyName") return a.companyName.localeCompare(b.companyName) * dir
      if (sortKey === "status") return a.status.localeCompare(b.status) * dir
      return (a.createdAt < b.createdAt ? -1 : 1) * dir
    })
  }, [initialLeads, search, statusFilter, minScore, sortKey, sortDir])

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(k); setSortDir(k === "companyName" || k === "status" ? "asc" : "desc") }
  }
  const arrow = (k: SortKey) => (sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : "")

  const inputCls = "bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[#5a5a54] focus:outline-none focus:border-[#c4f82a] transition-colors"

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Barre de filtres */}
      <div className="shrink-0 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <input type="text" placeholder="Rechercher entreprise, contact, email, ville…" value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputCls} w-full`} />
          {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-white">✕</button>}
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputCls} font-mono cursor-pointer`}>
          <option value="ALL">Tous statuts</option>
          {LEAD_STATUS_ORDER.map((s) => <option key={s} value={s}>{leadStatusLabel(s)}</option>)}
        </select>
        <div className="flex items-center gap-1.5 bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5">
          <span className="font-mono text-[#5a5a54] text-[10px]">Score ≥</span>
          <input type="number" min={0} max={100} placeholder="0" value={minScore} onChange={(e) => setMinScore(e.target.value === "" ? "" : Number(e.target.value))} className="w-9 bg-transparent text-xs font-bold font-mono text-[#c4f82a] focus:outline-none text-center" />
        </div>
        <span className="text-[11px] font-mono text-[#5a5a54] ml-auto tabular-nums">{rows.length} / {initialLeads.length}</span>
      </div>

      {/* Table dense */}
      <div className="flex-1 min-h-0 rounded-2xl border border-white/[0.07] bg-[#141416] overflow-hidden flex flex-col">
        {/* Header sticky */}
        <div className="shrink-0 grid grid-cols-[1fr_auto_auto] sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_7rem_5.5rem_8rem] gap-3 px-4 py-2.5 border-b border-white/[0.07] text-[10px] font-mono uppercase tracking-wider text-[#7a7a72]">
          <button onClick={() => toggleSort("companyName")} className="text-left hover:text-white transition-colors">Entreprise{arrow("companyName")}</button>
          <span className="hidden sm:block">Contact</span>
          <button onClick={() => toggleSort("status")} className="hidden sm:block text-left hover:text-white transition-colors">Statut{arrow("status")}</button>
          <span className="hidden sm:block text-center">Canaux</span>
          <button onClick={() => toggleSort("score")} className="text-right hover:text-white transition-colors">Score{arrow("score")}</button>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/[0.04]">
          {rows.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-[#5a5a54]">Aucun lead ne correspond aux filtres.</div>
          ) : (
            rows.map((l) => (
              <a key={l.id} href={`/admin/ai/acquisition/crm/${l.id}`} className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_7rem_5.5rem_8rem] gap-3 px-4 py-2.5 items-center hover:bg-white/[0.03] transition-colors group">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate group-hover:text-[#c4f82a] transition-colors">{l.companyName}</div>
                  <div className="text-[11px] text-[#5a5a54] truncate sm:hidden">{l.location ?? "—"} · <StatusInline status={l.status} /></div>
                </div>
                <div className="hidden sm:block min-w-0">
                  <div className="text-xs text-[#c9c9c2] truncate">{l.contactName ?? <span className="text-[#5a5a54]">—</span>}</div>
                  <div className="text-[10px] font-mono text-[#5a5a54] truncate">{l.contactEmail ?? "pas d'email"} · {l.location ?? "?"}</div>
                </div>
                <div className="hidden sm:block"><StatusBadge status={l.status} /></div>
                <div className="hidden sm:flex items-center justify-center gap-1.5 text-[10px] font-mono">
                  <ChannelDot on={!!l.contactEmail} label="M" title="Email" />
                  <ChannelDot on={l.hasPhone} label="T" title="Téléphone" />
                  <ChannelDot on={l.hasSite} label="W" title="Site web" />
                </div>
                <ScoreCell s={l.score} />
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function ChannelDot({ on, label, title }: { on: boolean; label: string; title: string }) {
  return (
    <span title={title} className={`w-4 h-4 grid place-items-center rounded ${on ? "bg-[#c4f82a]/15 text-[#c4f82a]" : "bg-white/[0.04] text-[#3a3a36]"}`}>{label}</span>
  )
}

function StatusInline({ status }: { status: string }) {
  return <span className="text-[#7a7a72]">{leadStatusLabel(status)}</span>
}
