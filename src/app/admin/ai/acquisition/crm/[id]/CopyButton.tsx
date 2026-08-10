"use client"

import { useState } from "react"

export function CopyButton({ text, label = "Copier" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1600)
        } catch {
          /* clipboard indisponible */
        }
      }}
      className="text-[11px] font-mono px-2.5 py-1 rounded-md border border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer shrink-0"
    >
      {done ? "✓ Copié" : label}
    </button>
  )
}
