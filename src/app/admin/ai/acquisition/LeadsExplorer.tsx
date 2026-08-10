"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { LEAD_STATUS_ORDER, leadStatusLabel } from "@/lib/leadStatus"
import { StatusBadge } from "@/components/StatusBadge"

interface Lead {
  id: string
  companyName: string
  contactEmail: string | null
  location: string | null
  status: string
  score: number | null
}

export function LeadsExplorer({ initialLeads }: { initialLeads: Lead[] }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Filtres initialisés depuis l'URL → persistés au retour depuis une fiche et
  // partageables (ex. lien "voir les CONTACTED" depuis le Kanban).
  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "ALL")
  const [minScore, setMinScore] = useState<number | "">(
    searchParams.get("min") ? Number(searchParams.get("min")) : "",
  )

  // Synchronise l'URL quand les filtres changent (remplace, ne pollue pas
  // l'historique).
  useEffect(() => {
    const p = new URLSearchParams()
    if (search) p.set("q", search)
    if (statusFilter !== "ALL") p.set("status", statusFilter)
    if (minScore !== "") p.set("min", String(minScore))
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [search, statusFilter, minScore, pathname, router])

  // Filter logic
  const filteredLeads = initialLeads.filter((lead) => {
    const matchesSearch = 
      lead.companyName.toLowerCase().includes(search.toLowerCase()) ||
      (lead.contactEmail || "").toLowerCase().includes(search.toLowerCase()) ||
      (lead.location || "").toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === "ALL" || lead.status === statusFilter

    const matchesScore = 
      minScore === "" || 
      (lead.score !== null && lead.score >= Number(minScore))

    return matchesSearch && matchesStatus && matchesScore
  })

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white/[0.02] border border-white/10 rounded-xl p-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Rechercher par entreprise, email, ville..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition-all"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 transition-all cursor-pointer"
          >
            <option value="ALL">Tous les statuts</option>
            {LEAD_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{leadStatusLabel(s)}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-400">Score min :</span>
          <input
            type="number"
            min={0}
            max={100}
            placeholder="0"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-16 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 transition-all"
          />
        </div>
      </div>

      {/* Leads Table / List */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {filteredLeads.length === 0 ? (
          <p className="p-6 text-sm text-zinc-400 text-center">Aucun lead ne correspond aux critères.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredLeads.map((lead) => (
              <Link key={lead.id} href={`/admin/ai/acquisition/crm/${lead.id}`} className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate text-sm">{lead.companyName}</p>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {lead.contactEmail ?? "Pas de contact"} · {lead.location ?? "Localisation inconnue"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={lead.status} />
                  <span
                    className={`text-sm font-bold tabular-nums w-10 text-right ${
                      lead.score == null
                        ? "text-zinc-600"
                        : lead.score >= 70
                        ? "text-emerald-400"
                        : lead.score >= 40
                        ? "text-amber-400"
                        : "text-zinc-400"
                    }`}
                  >
                    {lead.score ?? "—"}
                  </span>
                  <span className="text-violet-400 text-xs">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      
      <div className="text-right text-[10px] font-mono text-zinc-500">
        Total filtré : {filteredLeads.length} lead(s)
      </div>
    </div>
  )
}
