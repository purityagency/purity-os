"use client"

import { useTransition, useState } from "react"
import { enrichLeadNow } from "@/actions/acquisitionActions"

export function EnrichButton({ leadId }: { leadId: string }) {
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
            const r = await enrichLeadNow(leadId)
            setMsg(r.message)
          })
        }
        className="text-xs font-mono px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Enrichissement… (~30 s)" : "Enrichir maintenant"}
      </button>
      {msg && <span className="text-[11px] text-[#a3a9b4]">{msg}</span>}
    </div>
  )
}
