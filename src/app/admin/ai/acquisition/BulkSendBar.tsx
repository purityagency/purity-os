"use client"

import { useState, useTransition } from "react"
import { bulkApproveAndSend, bulkRejectUnsendable, rescoreAllLeads } from "@/actions/acquisitionActions"

// Barre d'envoi groupé : approuve + envoie d'un coup tous les brouillons dont le
// lead dépasse un score de qualité choisi. Chaque envoi repasse par les mêmes
// garde-fous que l'envoi unitaire (désinscrit, placeholder, email) — le lot ne
// contourne aucune sécurité. Confirmation obligatoire avant le tir groupé.
export function BulkSendBar({ scores }: { scores: number[] }) {
  const [minScore, setMinScore] = useState(60)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  // Nb de brouillons éligibles au seuil courant (score connu ≥ seuil) — calculé
  // en direct pendant qu'on bouge le curseur, pour savoir combien partiront.
  const eligible = scores.filter((s) => s >= minScore).length

  function run() {
    if (!confirm(`Approuver et envoyer tous les brouillons dont le lead a un score ≥ ${minScore} ? Cette action envoie de vrais emails.`)) return
    startTransition(async () => {
      const res = await bulkApproveAndSend(minScore, null)
      setMsg({ ok: res.ok, text: res.message })
    })
  }

  function cleanup() {
    if (!confirm("Retirer de la file tous les brouillons injoignables (lead sans email ou désinscrit) ?")) return
    startTransition(async () => {
      const res = await bulkRejectUnsendable(null)
      setMsg({ ok: res.ok, text: res.message })
    })
  }

  function rescore() {
    startTransition(async () => {
      const res = await rescoreAllLeads(null)
      setMsg({ ok: res.ok, text: res.message })
    })
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-2 text-xs text-zinc-300">
        <span className="font-semibold">Envoi groupé</span>
        <span className="text-zinc-500">— seuil de score qualité minimum :</span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          className="w-32 accent-[#c4f82a]"
          aria-label="Score minimum"
        />
        <span className="font-mono text-sm font-bold text-[#c4f82a] tabular-nums w-10 text-right">{minScore}</span>
      </div>

      <span className="text-xs text-zinc-400">
        <span className="font-bold text-white tabular-nums">{eligible}</span> éligible(s)
      </span>

      <button
        onClick={run}
        disabled={pending || eligible === 0}
        className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 transition-colors cursor-pointer"
      >
        {pending ? "Envoi en cours…" : `Approuver & envoyer les ${eligible} ≥ ${minScore}`}
      </button>

      <button
        onClick={cleanup}
        disabled={pending}
        className="rounded-lg border border-white/10 hover:bg-white/5 text-zinc-300 text-xs font-semibold px-3 py-2 transition-colors cursor-pointer disabled:opacity-40"
        title="Rejeter les brouillons sans email ou désinscrits"
      >
        Nettoyer les injoignables
      </button>

      <button
        onClick={rescore}
        disabled={pending}
        className="rounded-lg border border-white/10 hover:bg-white/5 text-zinc-300 text-xs font-semibold px-3 py-2 transition-colors cursor-pointer disabled:opacity-40"
        title="Recalculer le score de tous les leads avec le modèle actuel"
      >
        Re-scorer les leads
      </button>

      {msg && (
        <span className={`text-xs font-medium ${msg.ok ? "text-emerald-400" : "text-amber-400"}`}>{msg.text}</span>
      )}
    </div>
  )
}
