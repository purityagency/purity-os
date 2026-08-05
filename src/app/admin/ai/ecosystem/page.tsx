"use client"

import { useEffect, useRef, useState } from "react"
import { POLES, type AgentIdentity } from "@/lib/agentRoster"
import { EcosystemIcon, SearchIcon, UserIcon, SparklesIcon } from "@/components/icons"

type AgentActivity = {
  id: string
  agentName: string
  department: string
  status: "IDLE" | "WORKING" | "ERROR"
  currentTask: string | null
  lastLog: string | null
  updatedAt: string
}

const POLL_INTERVAL_MS = 5_000

export default function EcosystemPage() {
  const [activity, setActivity] = useState<Record<string, AgentActivity>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPole, setSelectedPole] = useState<string | null>(null)
  const pausedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function fetchAgents() {
      if (pausedRef.current || cancelled) return
      try {
        const res = await fetch("/api/agents/status")
        const data = await res.json()
        if (cancelled) return
        if (data.agents) {
          const byName: Record<string, AgentActivity> = {}
          for (const a of data.agents as AgentActivity[]) byName[a.agentName] = a
          setActivity(byName)
        }
      } catch (err) {
        console.error(err)
      }
    }

    fetchAgents()
    const interval = setInterval(fetchAgents, POLL_INTERVAL_MS)

    function onVisibilityChange() {
      pausedRef.current = document.hidden
      if (!document.hidden) fetchAgents()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])

  // Calculate stats
  const allAgents = POLES.flatMap(p => [p.chief, ...p.agents])
  const totalCount = allAgents.length
  const codedCount = allAgents.filter(a => a.coded).length
  const workingCount = Object.values(activity).filter(a => a.status === "WORKING").length

  const filteredPoles = POLES.map(pole => {
    if (selectedPole && pole.id !== selectedPole) return null
    if (!searchQuery.trim()) return pole

    const q = searchQuery.toLowerCase()
    const chiefMatch = pole.chief.fullName.toLowerCase().includes(q) || pole.chief.role.toLowerCase().includes(q)
    const matchingAgents = pole.agents.filter(a =>
      a.fullName.toLowerCase().includes(q) || a.role.toLowerCase().includes(q) || a.agentName.toLowerCase().includes(q)
    )

    if (chiefMatch || matchingAgents.length > 0) {
      return {
        ...pole,
        agents: chiefMatch ? pole.agents : matchingAgents
      }
    }
    return null
  }).filter(Boolean) as typeof POLES

  return (
    <div className="space-y-6 pb-12">
      {/* Header Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Arbre & Organigramme IA · Purity OS</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <EcosystemIcon className="w-7 h-7 text-violet-400" />
            <span>Matrice Écosystème & Agents IA</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Organigramme réel des {totalCount} identités d&apos;agents autonomes réparties sur les 7 Pôles.
          </p>
        </div>

        {/* Stats Ribbon */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.02] text-xs font-mono">
            <span className="text-zinc-500 uppercase block text-[9px]">Total Agents</span>
            <span className="font-bold text-white text-sm">{totalCount}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl border border-violet-500/20 bg-violet-500/10 text-xs font-mono">
            <span className="text-violet-400 uppercase block text-[9px]">Codés / Opérationnels</span>
            <span className="font-bold text-white text-sm">{codedCount}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-xs font-mono">
            <span className="text-emerald-400 uppercase block text-[9px]">En Cours de Tâche</span>
            <span className="font-bold text-emerald-400 text-sm">{workingCount}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] border border-white/10 rounded-xl p-3 backdrop-blur-md">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <SearchIcon className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Chercher un agent, nom ou fonction (ex: Manon Verhoeven, Copywriter, Sentinel)..."
            className="w-full bg-transparent text-xs text-white placeholder:text-zinc-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setSelectedPole(null)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
              selectedPole === null ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Tous (7 Pôles)
          </button>
          {POLES.map((pole) => (
            <button
              key={pole.id}
              onClick={() => setSelectedPole(selectedPole === pole.id ? null : pole.id)}
              className={`px-2 py-1 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                selectedPole === pole.id ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              P{pole.id}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Tree Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPoles.map((pole) => (
          <PoleCard key={pole.id} pole={pole} activity={activity} />
        ))}
      </div>
    </div>
  )
}

function PoleCard({
  pole,
  activity,
}: {
  pole: (typeof POLES)[number]
  activity: Record<string, AgentActivity>
}) {
  const isDirection = pole.id === "00"
  const codedAgents = pole.agents.filter(a => a.coded).length + (pole.chief.coded ? 1 : 0)
  const totalAgents = pole.agents.length + 1

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 backdrop-blur-2xl overflow-hidden flex flex-col justify-between ${
        isDirection
          ? "border-violet-500/40 bg-gradient-to-br from-violet-950/30 via-black to-white/[0.02] shadow-xl shadow-violet-950/20 md:col-span-2 lg:col-span-3"
          : "border-white/10 bg-white/[0.01] hover:border-violet-500/30 hover:bg-white/[0.03]"
      }`}
    >
      {/* Header du Pôle */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-white border border-white/10">
            PÔLE {pole.id}
          </span>
          <div>
            <h3 className="font-bold text-white text-sm tracking-tight flex items-center gap-1.5">
              <span>{pole.name}</span>
              {isDirection && <SparklesIcon className="w-4 h-4 text-violet-400" />}
            </h3>
          </div>
        </div>

        <span className="text-[10px] font-mono text-zinc-500">
          {codedAgents}/{totalAgents} codé(s)
        </span>
      </div>

      {/* Liste des Agents du Pôle */}
      <div className="divide-y divide-white/5 flex-1">
        {/* Chef du Pôle */}
        <AgentRow identity={pole.chief} activity={activity[pole.chief.agentName]} isChief />

        {/* Agents Spécialistes */}
        {pole.agents.map((agent) => (
          <AgentRow key={agent.agentName} identity={agent} activity={activity[agent.agentName]} />
        ))}
      </div>
    </div>
  )
}

function StatusBadge({ activity, coded }: { activity: AgentActivity | undefined; coded: boolean }) {
  if (!coded) return <span className="text-[10px] font-mono text-zinc-600">Pas encore codé</span>
  if (!activity) return <span className="text-[10px] font-mono text-zinc-500">En veille</span>
  if (activity.status === "ERROR") return <span className="text-[10px] font-mono text-red-400 font-bold">⚠️ Erreur</span>
  if (activity.status === "WORKING") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        En exécution
      </span>
    )
  }
  return <span className="text-[10px] font-mono text-zinc-500">Opérationnel</span>
}

function AgentRow({
  identity,
  activity,
  isChief,
}: {
  identity: AgentIdentity
  activity: AgentActivity | undefined
  isChief?: boolean
}) {
  return (
    <div
      className={`p-3.5 transition-colors ${
        isChief ? "bg-violet-500/[0.04]" : "hover:bg-white/[0.02]"
      } ${!identity.coded ? "opacity-45" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 mt-0.5 ${
            isChief
              ? "bg-violet-600/30 text-violet-300 border border-violet-500/40"
              : identity.coded
              ? "bg-white/10 text-zinc-300 border border-white/10"
              : "bg-white/5 text-zinc-600 border border-white/5"
          }`}>
            <UserIcon className="w-3.5 h-3.5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className={`font-semibold text-white truncate ${isChief ? "text-xs font-bold" : "text-xs"}`}>
                {identity.fullName}
              </p>
              {isChief && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Chief
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">{identity.role}</p>
            <p className="text-[9px] font-mono text-zinc-600 truncate mt-0.2">{identity.agentName}</p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <StatusBadge activity={activity} coded={identity.coded} />
        </div>
      </div>

      {identity.coded && activity?.currentTask && activity.status === "WORKING" && (
        <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-300 truncate">
          ▶ {activity.currentTask}
        </div>
      )}
    </div>
  )
}
