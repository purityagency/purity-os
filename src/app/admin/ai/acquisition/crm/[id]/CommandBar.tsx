"use client"

import { useState } from "react"
import { CommandChip } from "@/components/ui/command-chip"
import { CallSheetButton } from "./CallSheetButton"
import { PhoneIcon, GlobeIcon, MailIcon, LocationIcon } from "@/components/icons"

// Barre flottante compacte façon Raycast — actions toujours accessibles,
// jamais de gros bouton. "Ouvrir le script" ET "Ajouter une note" pointent
// tous deux vers la Cockpit existante (CallSheetButton) plutôt que de
// dupliquer un 2e système de script/notes : la Cockpit a déjà les deux.

export interface CommandBarProps {
  leadId: string
  phone: string | null // affichage, ex "0465 36 82 65"
  phoneDial: string | null // ex "+32465368265"
  mapsLink: string
  websiteUrl: string | null
  email: string | null
}

export function CommandBar({ leadId, phone, phoneDial, mapsLink, websiteUrl, email }: CommandBarProps) {
  const [copied, setCopied] = useState(false)

  async function copyPhone() {
    if (!phone) return
    try {
      await navigator.clipboard.writeText(phone)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard indisponible */
    }
  }

  return (
    <div className="glass-panel sticky top-4 z-30 flex flex-wrap items-center gap-2 rounded-full px-3 py-2.5">
      {phoneDial ? (
        <CommandChip label="Appeler" value={phone ?? undefined} tone="success" icon={<PhoneIcon />} href={`tel:${phoneDial}`} />
      ) : (
        <CommandChip label="Pas de numéro" tone="neutral" icon={<PhoneIcon />} disabled />
      )}
      <CommandChip label={copied ? "Copié ✓" : "Copier le numéro"} tone="neutral" onClick={copyPhone} disabled={!phone} />
      <CommandChip label="Maps" tone="neutral" icon={<LocationIcon />} href={mapsLink} />
      {websiteUrl && <CommandChip label="Site" tone="neutral" size="sm" icon={<GlobeIcon />} href={websiteUrl} />}
      {email && <CommandChip label="Email" tone="neutral" size="sm" icon={<MailIcon />} href={`mailto:${email}`} />}
      <div className="ml-auto">
        <CallSheetButton
          leadId={leadId}
          label="📞 Script & notes"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#A855F7]/25 bg-[#A855F7]/10 text-[#d8b4fe] hover:bg-[#A855F7]/15 hover:border-[#A855F7]/40 px-3 py-1.5 text-[12px] font-medium whitespace-nowrap cursor-pointer transition-colors"
        />
      </div>
    </div>
  )
}
