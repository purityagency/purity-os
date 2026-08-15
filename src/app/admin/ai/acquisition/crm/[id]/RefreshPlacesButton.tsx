"use client"

import { useTransition, useState } from "react"
import { refreshGooglePlaces } from "@/actions/acquisitionActions"

export function RefreshPlacesButton({ leadId }: { leadId: string }) {
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
            const r = await refreshGooglePlaces(leadId)
            setMsg(r.message)
          })
        }
        className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/15 text-[#6366f1] hover:bg-indigo-500/25 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
      >
        {pending ? "Actualisation…" : "🔄 Actualiser Google Business"}
      </button>
      {msg && <span className="text-[11px] text-[#a3a9b4]">{msg}</span>}
    </div>
  )
}
