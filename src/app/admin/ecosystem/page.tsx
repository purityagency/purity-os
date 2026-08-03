"use client"

import { useEffect, useRef, useState } from "react"
import { POLES, type AgentIdentity } from "@/lib/agentRoster"

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Équipe IA</h1>
        <p className="mt-1 text-sm text-zinc-400">
          L&apos;organigramme réel — nom, poste, état. Un agent grisé n&apos;est pas hors service, il n&apos;a simplement pas encore été codé.
        </p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[1080px] flex flex-wrap gap-5 justify-center">
          {POLES.map((pole) => (
            <PoleColumn key={pole.id} pole={pole} activity={activity} />
          ))}
        </div>
      </div>
    </div>
  )
}

function PoleColumn({
  pole,
  activity,
}: {
  pole: (typeof POLES)[number]
  activity: Record<string, AgentActivity>
}) {
  return (
    <div className="flex flex-col w-[340px] shrink-0 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="p-3 border-b border-white/10 flex items-center gap-2">
        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-zinc-300">
          Pôle {pole.id}
        </span>
        <span className="text-sm font-semibold text-white">{pole.name}</span>
      </div>

      <div className="divide-y divide-white/10">
        <NodeRow identity={pole.chief} activity={activity[pole.chief.agentName]} isChief />
        {pole.agents.map((agent) => (
          <NodeRow key={agent.agentName} identity={agent} activity={activity[agent.agentName]} />
        ))}
      </div>
    </div>
  )
}

function StatusLabel({ activity, coded }: { activity: AgentActivity | undefined; coded: boolean }) {
  if (!coded) return <span className="text-[11px] text-zinc-600">Pas encore codé</span>
  if (!activity) return <span className="text-[11px] text-zinc-500">Jamais exécuté</span>
  if (activity.status === "ERROR") return <span className="text-[11px] text-red-400">Erreur récente</span>
  if (activity.status === "WORKING") return <span className="text-[11px] text-emerald-400">En cours</span>
  return <span className="text-[11px] text-zinc-500">En veille</span>
}

function NodeRow({
  identity,
  activity,
  isChief,
}: {
  identity: AgentIdentity
  activity: AgentActivity | undefined
  isChief?: boolean
}) {
  return (
    <div className={`p-3.5 ${!identity.coded ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-medium text-white ${isChief ? "text-sm" : "text-sm"}`}>
            {identity.fullName}
            {isChief && <span className="text-zinc-500 font-normal text-xs"> · Chief</span>}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">{identity.role}</p>
        </div>
        <div className="shrink-0 pt-0.5">
          <StatusLabel activity={activity} coded={identity.coded} />
        </div>
      </div>
      {identity.coded && activity?.currentTask && activity.status === "WORKING" && (
        <p className="text-xs text-emerald-400/80 mt-1.5 truncate">{activity.currentTask}</p>
      )}
    </div>
  )
}
