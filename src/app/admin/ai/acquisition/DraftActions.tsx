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
      <div className="flex items-center gap-2">
        <form action={rejectAction}>
          <button
            type="submit"
            disabled={rejectPending || approvePending || rejectState?.ok || approveState?.ok}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-red-500/30 hover:border-red-500/40 hover:bg-red-500/15 text-red-400 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {rejectPending ? "Rejet..." : "Rejeter"}
          </button>
        </form>
        <form action={approveAction}>
          <button
            type="submit"
            disabled={!hasContactEmail || approvePending || rejectPending || approveState?.ok || rejectState?.ok}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#6366f1] hover:bg-[#5b52e8] text-white transition flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {approvePending ? (
              "Envoi..."
            ) : (
              <>
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
                <span>Valider & Envoyer</span>
              </>
            )}
          </button>
        </form>
      </div>
      {lastState && (
        <p className={`text-xs font-medium mt-1 ${lastState.ok ? "text-emerald-400" : "text-red-400"}`}>
          {lastState.ok ? "✓ " : "✕ "}
          {lastState.message}
        </p>
      )}
    </div>
  )
}
