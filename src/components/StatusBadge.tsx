import { leadStatusLabel, LEAD_STATUS_BADGE } from "@/lib/leadStatus"

// Badge de statut de lead unifié — un seul rendu pour tous les écrans.
export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const style = LEAD_STATUS_BADGE[status] ?? "bg-white/5 text-zinc-300 border-white/15"
  return (
    <span className={`inline-flex items-center text-[11px] font-mono px-2 py-0.5 rounded-md border ${style} ${className}`}>
      {leadStatusLabel(status)}
    </span>
  )
}
