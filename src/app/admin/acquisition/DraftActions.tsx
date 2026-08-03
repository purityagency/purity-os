"use client"

import { useActionState } from "react"
import { approveAndSendDraft, rejectDraft } from "@/actions/acquisitionActions"

export function DraftActions({ draftId, hasContactEmail }: { draftId: string; hasContactEmail: boolean }) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveAndSendDraft.bind(null, draftId),
    null,
  )
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectDraft.bind(null, draftId),
    null,
  )

  const lastState = approveState ?? rejectState

  return (
    <div className="flex flex-col items-end gap-1.5 shrink-0">
      <div className="flex gap-2">
        <form action={rejectAction}>
          <button
            type="submit"
            disabled={rejectPending || approvePending || rejectState?.ok || approveState?.ok}
            className="px-3 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          >
            {rejectPending ? "Rejet…" : "Rejeter"}
          </button>
        </form>
        <form action={approveAction}>
          <button
            type="submit"
            disabled={!hasContactEmail || approvePending || rejectPending || approveState?.ok || rejectState?.ok}
            className="px-3 py-1 text-xs rounded bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          >
            {approvePending ? "Envoi…" : "Valider & Envoyer"}
          </button>
        </form>
      </div>
      {lastState && (
        <p className={`text-xs ${lastState.ok ? "text-emerald-400" : "text-red-400"}`}>
          {lastState.ok ? "✓ " : "✕ "}
          {lastState.message}
        </p>
      )}
    </div>
  )
}
