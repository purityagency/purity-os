"use client"

import { useTransition, useState } from "react"
import { generateLeadStrategy } from "@/actions/acquisitionActions"

export function GenerateStrategyButton({ leadId, hasStrategy }: { leadId: string; hasStrategy: boolean }) {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMsg(null)
            const r = await generateLeadStrategy(leadId)
            setMsg(r.message)
          })
        }
        className="text-[11px] font-mono px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/15 text-[#6366f1] hover:bg-indigo-500/25 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
      >
        {pending ? "Génération…" : hasStrategy ? "🧠 Régénérer la stratégie" : "🧠 Générer une stratégie"}
      </button>
      {msg && <span className="text-[11px] text-[#a3a9b4]">{msg}</span>}
    </div>
  )
}
