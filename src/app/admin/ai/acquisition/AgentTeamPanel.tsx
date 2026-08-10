// Panneau "Équipe IA d'acquisition" : preuve réelle des 10 agents du pôle.
// Modèle team-agent-orchestration — chaque agent = State + Evidence + heartbeat.
// Aucun chiffre inventé : tout vient de la base (leads sourcés/audités/scorés,
// mails rédigés/envoyés, angles générés) et du statut réel (AgentActivity).

export interface AgentCard {
  name: string
  role: string
  proofValue: number
  proofLabel: string
  status: "active" | "idle" | "error"
  lastLog: string | null
}

const DOT: Record<AgentCard["status"], string> = {
  active: "bg-emerald-400",
  idle: "bg-zinc-600",
  error: "bg-red-400",
}

const STATUS_LABEL: Record<AgentCard["status"], string> = {
  active: "a agi récemment",
  idle: "en veille",
  error: "erreur",
}

function AgentTile({ a }: { a: AgentCard }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 flex flex-col gap-2 transition-colors hover:border-white/15">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">{a.name}</div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 truncate">{a.role}</div>
        </div>
        <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${DOT[a.status]}`} title={STATUS_LABEL[a.status]} />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold font-mono tabular-nums text-white leading-none">{a.proofValue}</span>
        <span className="text-[10px] text-zinc-500 leading-tight">{a.proofLabel}</span>
      </div>
      {a.lastLog && (
        <p className="text-[10px] text-zinc-600 leading-snug line-clamp-2" title={a.lastLog}>{a.lastLog}</p>
      )}
    </div>
  )
}

export function AgentTeamPanel({ agents }: { agents: AgentCard[] }) {
  const active = agents.filter((a) => a.status === "active").length
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Équipe IA d&apos;acquisition · 10 agents</span>
        <span className="text-[10px] font-mono text-zinc-600 tabular-nums">{active}/{agents.length} actifs aujourd&apos;hui</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {agents.map((a) => <AgentTile key={a.name} a={a} />)}
      </div>
    </section>
  )
}
