"use client"

import { useState } from "react"

interface Lead {
  id: string
  companyName: string
  contactEmail: string | null
  location: string | null
  status: string
  score: number | null
}

export function LeadsExplorer({ initialLeads }: { initialLeads: Lead[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [minScore, setMinScore] = useState<number | "">("")

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
            <option value="NEW">NEW</option>
            <option value="ENRICHED">ENRICHED</option>
            <option value="DRAFTED">DRAFTED</option>
            <option value="CONTACTED">CONTACTED</option>
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
              <div key={lead.id} className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate text-sm">{lead.companyName}</p>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {lead.contactEmail ?? "Pas de contact"} · {lead.location ?? "Localisation inconnue"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono bg-white/10 text-zinc-300">
                    {lead.status}
                  </span>
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
                </div>
              </div>
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
