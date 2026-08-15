"use client"

import { useState } from "react"
import { CommandChip } from "@/components/ui/command-chip"
import { InspectorDrawer } from "@/components/ui/inspector-drawer"

// Possède l'état "quel inspecteur est ouvert" — un seul à la fois, jamais de
// navigation, le contexte de la page (scroll/URL) reste intact. Le CONTENU de
// chaque inspecteur est calculé côté serveur dans page.tsx et transmis ici en
// simple ReactNode (pattern Server Component en enfant d'un Client Component).

export interface InspectorSpec {
  key: string
  label: string
  value?: string
  icon?: React.ReactNode
  tone?: "neutral" | "ai" | "warn" | "critical" | "success"
  title: string
  subtitle?: string
  content: React.ReactNode
}

export function SpotlightInspectors({ inspectors }: { inspectors: InspectorSpec[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const active = inspectors.find((i) => i.key === open) ?? null

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {inspectors.map((i) => (
          <CommandChip
            key={i.key}
            label={i.label}
            value={i.value}
            icon={i.icon}
            tone={i.tone}
            onClick={() => setOpen(i.key)}
          />
        ))}
      </div>

      <InspectorDrawer open={active !== null} onClose={() => setOpen(null)} title={active?.title ?? ""} subtitle={active?.subtitle}>
        {active?.content}
      </InspectorDrawer>
    </>
  )
}
