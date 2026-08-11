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

  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "ALL")
  const [minScore, setMinScore] = useState<number | "">(
    searchParams.get("min") ? Number(searchParams.get("min")) : ""
  )

  useEffect(() => {
    const p = new URLSearchParams()
    if (search) p.set("q", search)
    if (statusFilter !== "ALL") p.set("status", statusFilter)
    if (minScore !== "") p.set("min", String(minScore))
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [search, statusFilter, minScore, pathname, router])

  const filteredLeads = initialLeads.filter((lead) => {
    const matchesSearch =
      lead.companyName.toLowerCase().includes(search.toLowerCase()) ||
      (lead.contactEmail || "").toLowerCase().includes(search.toLowerCase()) ||
      (lead.location || "").toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === "ALL" || lead.status === statusFilter
    const matchesScore =
      minScore === "" || (lead.score !== null && lead.score >= Number(minScore))

    return matchesSearch && matchesStatus && matchesScore
  })

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#141417] border border-white/[0.08] rounded-2xl p-4">
        {/* Search */}
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher une entreprise, un email, une ville..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#c4f82a] transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#c4f82a] transition-all cursor-pointer font-mono"
          >
            <option value="ALL">Tous les statuts ({initialLeads.length})</option>
            {LEAD_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {leadStatusLabel(s)}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-300">
            <span className="font-mono text-zinc-500 text-[11px]">Score min :</span>
            <input
              type="number"
              min={0}
              max={100}
              placeholder="0"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-12 bg-transparent text-xs font-bold font-mono text-[#c4f82a] focus:outline-none text-center"
            />
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#121214] overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-zinc-500">
            Aucun prospect ne correspond à vos filtres actuels.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {filteredLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/admin/ai/acquisition/crm/${lead.id}`}
                className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white text-sm truncate group-hover:text-[#c4f82a] transition-colors">
                      {lead.companyName}
                    </p>
                    <StatusBadge status={lead.status} />
                  </div>
                  <p className="text-xs text-zinc-400 truncate mt-1 font-mono">
                    {lead.contactEmail ? (
                      <span className="text-zinc-300">{lead.contactEmail}</span>
                    ) : (
                      <span className="text-zinc-600 italic">Pas d&apos;email direct</span>
                    )}{" "}
                    · <span className="text-zinc-500">{lead.location ?? "Localisation non précisée"}</span>
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0 font-mono">
                  <div className="text-right">
                    <div className="text-[10px] text-zinc-500 uppercase">Score IA</div>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        lead.score == null
                          ? "text-zinc-600"
                          : lead.score >= 70
                          ? "text-[#c4f82a]"
                          : lead.score >= 40
                          ? "text-amber-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {lead.score ?? "—"}/100
                    </span>
                  </div>
                  <span className="text-[#c4f82a] text-sm group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 px-1">
        <span>Affichage de {filteredLeads.length} sur {initialLeads.length} leads qualifiés</span>
        <span>Triés par Score Qualité décroissant</span>
      </div>
    </div>
  )
}
