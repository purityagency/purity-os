"use client"

import { motion } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import { useReducedMotion } from "@/hooks/useReducedMotion"

// Anneau segmenté façon Apple Activity Rings : 3 anneaux concentriques
// (pas un seul anneau divisé en camemberts) — c'est la lecture la plus fidèle
// de "impression d'un composant natif Apple" ET la plus robuste à animer
// (même trick strokeDasharray/strokeDashoffset que ProgressRing existant
// dans dashboard/page.tsx, juste répété à 3 rayons différents).

const ringVariants = cva("shrink-0", {
  variants: {
    size: {
      sm: "",
      md: "",
      lg: "",
    },
  },
  defaultVariants: { size: "md" },
})

const SIZE_PX: Record<"sm" | "md" | "lg", number> = { sm: 64, md: 88, lg: 120 }

export interface InsightRingSegment {
  label: string
  value: number // 0-100
  color: string // valeur CSS (var(--chart-1) etc.)
}

export interface InsightRingProps extends VariantProps<typeof ringVariants> {
  segments: InsightRingSegment[] // rendus de l'extérieur vers l'intérieur, dans l'ordre du tableau
  centerValue?: string
  centerLabel?: string
  className?: string
}

export function InsightRing({ segments, size, centerValue, centerLabel, className }: InsightRingProps) {
  const reduced = useReducedMotion()
  const px = SIZE_PX[size ?? "md"]
  const stroke = px <= 64 ? 6 : px <= 88 ? 8 : 10
  const gap = 3 // espace visuel entre anneaux

  return (
    <div className={`relative inline-flex items-center justify-center ${ringVariants({ size })} ${className ?? ""}`} style={{ width: px, height: px }}>
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} className="-rotate-90 absolute inset-0">
        {segments.map((seg, i) => {
          const radius = px / 2 - stroke / 2 - i * (stroke + gap)
          if (radius <= 0) return null
          const circumference = 2 * Math.PI * radius
          const pct = Math.min(100, Math.max(0, seg.value))
          const targetOffset = circumference - (pct / 100) * circumference
          return (
            <g key={seg.label}>
              <circle cx={px / 2} cy={px / 2} r={radius} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-white/5" />
              <motion.circle
                cx={px / 2}
                cy={px / 2}
                r={radius}
                stroke={seg.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: reduced ? targetOffset : circumference }}
                animate={{ strokeDashoffset: targetOffset }}
                transition={{ duration: reduced ? 0 : 0.9, delay: reduced ? 0 : i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              />
            </g>
          )
        })}
      </svg>
      {(centerValue || centerLabel) && (
        <div className="relative flex flex-col items-center justify-center text-center leading-none">
          {centerValue && <span className="font-heading font-bold tabular-nums text-[#fafafa]" style={{ fontSize: px * 0.24 }}>{centerValue}</span>}
          {centerLabel && <span className="text-[9px] font-mono uppercase tracking-wider text-[#a1a1aa] mt-1">{centerLabel}</span>}
        </div>
      )}
    </div>
  )
}
