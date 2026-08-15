"use client"

import { motion } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import { useReducedMotion } from "@/hooks/useReducedMotion"

// Primitive commune à la Command Bar (actions : appeler, copier, Maps...) et
// aux Command Chips (SEO/Performance/Maps/Réputation/Technique, qui ouvrent un
// InspectorDrawer). Densité façon Raycast — jamais de gros bouton.

const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium whitespace-nowrap cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed select-none",
  {
    variants: {
      tone: {
        neutral: "border-white/10 bg-white/[0.03] text-[#e4e4e7] hover:bg-white/[0.07] hover:border-white/20",
        ai: "border-[#A855F7]/25 bg-[#A855F7]/10 text-[#d8b4fe] hover:bg-[#A855F7]/15 hover:border-[#A855F7]/40",
        warn: "border-amber-500/25 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15",
        critical: "border-red-500/25 bg-red-500/10 text-red-300 hover:bg-red-500/15",
        success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15",
      },
      size: {
        sm: "px-2.5 py-1 text-[11px]",
        md: "",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  }
)

export interface CommandChipProps extends VariantProps<typeof chipVariants> {
  label: string
  value?: string
  icon?: React.ReactNode
  onClick?: () => void
  href?: string
  disabled?: boolean
  className?: string
}

export function CommandChip({ label, value, icon, onClick, href, disabled, tone, size, className }: CommandChipProps) {
  const reduced = useReducedMotion()
  const classes = `${chipVariants({ tone, size })} ${className ?? ""}`
  const content = (
    <>
      {icon && <span className="shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">{icon}</span>}
      <span>{label}</span>
      {value && <span className="font-mono tabular-nums opacity-80">{value}</span>}
    </>
  )

  const motionProps = reduced ? {} : { whileTap: { scale: 0.96 }, whileHover: { y: -1 } }

  if (href) {
    return (
      <motion.a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...motionProps}>
        {content}
      </motion.a>
    )
  }

  return (
    <motion.button type="button" onClick={onClick} disabled={disabled} className={classes} {...motionProps}>
      {content}
    </motion.button>
  )
}
