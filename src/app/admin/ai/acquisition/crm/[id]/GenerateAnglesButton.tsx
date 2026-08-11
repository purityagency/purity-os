"use client"

import { useTransition, useState } from "react"
import { generateLeadAngles } from "@/actions/acquisitionActions"

export function GenerateAnglesButton({ leadId, hasAngles }: { leadId: string; hasAngles: boolean }) {
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
            const r = await generateLeadAngles(leadId)
            setMsg(r.message)
          })
        }
        className="text-xs font-mono px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/15 text-[#6366f1] hover:bg-indigo-500/25 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Génération…" : hasAngles ? "Régénérer les angles" : "Générer les angles multi-canaux"}
      </button>
      {msg && <span className="text-[11px] text-[#a3a9b4]">{msg}</span>}
    </div>
  )
}
