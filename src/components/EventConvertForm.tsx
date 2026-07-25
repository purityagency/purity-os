"use client"

import { useState, useId } from "react"
import { convertEventToProject } from "@/actions/eventActions"

interface EventConvertFormProps {
  eventId: string
  defaultName: string
  defaultEmail: string
  defaultProjectName: string
}

export function EventConvertForm({ eventId, defaultName, defaultEmail, defaultProjectName }: EventConvertFormProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const convert = convertEventToProject.bind(null, eventId)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        aria-controls={panelId}
        className="rounded-lg bg-[#7C3AED] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#6D28D9] transition-colors active:scale-[0.98]"
      >
        Créer le dossier client
      </button>
    )
  }

  return (
    <div id={panelId} className="w-full rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/5 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-white">Créer le dossier client</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Crée le compte client et son projet, puis lui envoie son lien d&apos;accès.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Annuler la création du dossier"
          className="text-zinc-400 hover:text-white transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <form action={convert} className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`${panelId}-name`} className="block text-[11px] text-zinc-400">Nom du client</label>
          <input
            id={`${panelId}-name`}
            name="name"
            defaultValue={defaultName}
            required
            maxLength={200}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/60"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${panelId}-email`} className="block text-[11px] text-zinc-400">E-mail</label>
          <input
            id={`${panelId}-email`}
            name="email"
            type="email"
            defaultValue={defaultEmail}
            required
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/60"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor={`${panelId}-project`} className="block text-[11px] text-zinc-400">Nom du projet</label>
          <input
            id={`${panelId}-project`}
            name="projectName"
            defaultValue={defaultProjectName}
            required
            maxLength={200}
            placeholder="Ex : Site vitrine + réservation en ligne"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/60"
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="w-full rounded-lg bg-[#7C3AED] px-3 py-2 text-sm font-medium text-white hover:bg-[#6D28D9] transition-colors active:scale-[0.98]"
          >
            Créer et envoyer l&apos;accès
          </button>
        </div>
      </form>
    </div>
  )
}
