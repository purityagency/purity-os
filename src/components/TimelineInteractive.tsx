"use client"

import { useState } from "react"
import { updateStageStatus } from "@/actions/stageActions"
import { Button } from "@/components/ui/button"

const STATUSES = ["PENDING", "IN_PROGRESS", "WAITING_CLIENT", "BLOCKED", "REVIEW", "COMPLETED"]

export function TimelineInteractive({ stages, projectId }: { stages: any[], projectId: string }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleStatusChange = async (stageId: string, newStatus: string) => {
    setLoadingId(stageId)
    try {
      await updateStageStatus(stageId, projectId, newStatus)
    } finally {
      setLoadingId(null)
    }
  }

  if (stages.length === 0) {
    return <p className="text-sm text-zinc-500">Aucune étape pour ce projet.</p>
  }

  return (
    <div className="space-y-4">
      {stages.map((stage) => (
        <div key={stage.id} className="p-4 rounded-lg bg-black/20 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="font-bold">{stage.title}</div>
            <div className="text-sm text-zinc-400">{stage.description}</div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {STATUSES.map(status => {
              const isActive = stage.status === status
              return (
                <button
                  key={status}
                  disabled={loadingId === stage.id}
                  onClick={() => handleStatusChange(stage.id, status)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    isActive 
                      ? "bg-[#7C3AED] text-white" 
                      : "bg-white/5 text-zinc-400 hover:bg-white/10"
                  } ${loadingId === stage.id ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {status}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
