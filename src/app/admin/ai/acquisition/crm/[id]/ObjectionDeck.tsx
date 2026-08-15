"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { CopyButton } from "./CopyButton"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import type { Objection } from "@/lib/acquisition/salesKit"

// Deck horizontal façon Apple Wallet : cartes compressées, la plus probable
// (déjà en tête du tableau — salesKit ordonne objections[0] sur l'angle
// principal du prospect) légèrement plus grande, expansion au clic.

export function ObjectionDeck({ objections }: { objections: Objection[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const reduced = useReducedMotion()

  if (objections.length === 0) return null

  return (
    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 custom-scrollbar">
      {objections.map((o, i) => {
        const isOpen = openIndex === i
        const isPrimary = i === 0
        return (
          <motion.div
            key={i}
            layout={!reduced}
            onClick={() => setOpenIndex(isOpen ? null : i)}
            className={`glass-panel snap-start shrink-0 cursor-pointer rounded-2xl p-4 transition-colors ${
              isPrimary ? "w-[280px]" : "w-[240px]"
            } ${isOpen ? "border-[#A855F7]/30" : ""}`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              {isPrimary && (
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#A855F7] bg-[#A855F7]/10 px-1.5 py-0.5 rounded">Le plus probable</span>
              )}
            </div>
            <div className="text-[14px] font-semibold text-[#fafafa] leading-snug">{o.trigger}</div>
            {isOpen && (
              <motion.div
                initial={reduced ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: reduced ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="mt-2.5 pt-2.5 border-t border-white/5"
              >
                <p className="text-[13px] text-[#a1a1aa] leading-relaxed">{o.response}</p>
                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                  <CopyButton text={o.response} label="Copier" />
                </div>
              </motion.div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
