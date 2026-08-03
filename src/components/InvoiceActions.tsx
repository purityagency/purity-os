"use client"

import { useActionState } from "react"
import { generateInvoice } from "@/actions/financeActions"

const KIND_LABELS = { DEPOSIT: "Acompte", BALANCE: "Solde", FULL: "Prestation complète" } as const

export function InvoiceActions({
  projectId,
  available,
}: {
  projectId: string
  available: { kind: "DEPOSIT" | "BALANCE" | "FULL"; amount: number }[]
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {available.map((item) => (
        <GenerateButton key={item.kind} projectId={projectId} kind={item.kind} amount={item.amount} />
      ))}
    </div>
  )
}

function GenerateButton({
  projectId,
  kind,
  amount,
}: {
  projectId: string
  kind: "DEPOSIT" | "BALANCE" | "FULL"
  amount: number
}) {
  const [state, action, pending] = useActionState(generateInvoice.bind(null, projectId, kind), null)

  return (
    <div className="flex flex-col gap-1">
      <form action={action}>
        <button
          type="submit"
          disabled={pending || state?.ok}
          className="h-7 px-3 text-xs rounded bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors disabled:opacity-40"
        >
          {pending ? "Génération…" : `Facturer ${KIND_LABELS[kind]} (${amount}€)`}
        </button>
      </form>
      {state && (
        <p className={`text-[11px] ${state.ok ? "text-emerald-400" : "text-red-400"}`}>{state.message}</p>
      )}
    </div>
  )
}
