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
        className="text-xs font-mono px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Génération…" : hasAngles ? "Régénérer les angles" : "Générer les angles multi-canaux"}
      </button>
      {msg && <span className="text-[11px] text-zinc-400">{msg}</span>}
    </div>
  )
}
