"use client"

import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/hooks/useReducedMotion"

// Généralise le pattern slide-over déjà éprouvé dans AcquisitionHeaderActions.tsx
// (overlay + panel framer-motion) en y ajoutant ce qui lui manquait : fermeture
// Escape + verrou de scroll (repris de CallSheetButton.tsx) et un focus-trap
// (nouveau — premier endroit du code à le faire proprement). Surface en
// .glass-panel (Liquid Glass) plutôt que le fond plat #060309 du précédent.

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export interface InspectorDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: React.ReactNode
  children: React.ReactNode
}

export function InspectorDrawer({ open, onClose, title, subtitle, icon, children }: InspectorDrawerProps) {
  const reduced = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (e.key !== "Tab" || !panelRef.current) return
      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hasAttribute("disabled"))
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = prevOverflow
      previouslyFocused.current?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ x: reduced ? 0 : "100%", opacity: reduced ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduced ? 0 : "100%", opacity: reduced ? 0 : 1 }}
            transition={{ duration: reduced ? 0.15 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="glass-panel fixed inset-y-0 right-0 z-50 w-full sm:max-w-md flex flex-col outline-none"
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/5 shrink-0">
              <div className="min-w-0 flex items-center gap-2.5">
                {icon && <span className="text-[#A855F7] shrink-0">{icon}</span>}
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold text-[#fafafa] tracking-tight truncate">{title}</h2>
                  {subtitle && <p className="text-[11px] text-[#a1a1aa] mt-0.5 truncate">{subtitle}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="shrink-0 w-9 h-9 grid place-items-center rounded-lg text-[#a1a1aa] hover:text-[#fafafa] hover:bg-white/5 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
