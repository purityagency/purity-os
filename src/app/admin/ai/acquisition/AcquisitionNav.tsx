"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function AcquisitionNav() {
  const pathname = usePathname()

  const links = [
    { name: "Vue d'ensemble", href: "/admin/ai/acquisition" },
    { name: "Pipeline CRM", href: "/admin/ai/acquisition/crm" },
    { name: "Brouillons à Valider", href: "/admin/ai/acquisition/drafts" },
    { name: "Historique d'Envois", href: "/admin/ai/acquisition/outbox" },
  ]

  return (
    <div className="flex flex-wrap gap-2 mb-4 shrink-0 bg-white/[0.02] p-1.5 rounded-xl border border-white/5 w-fit">
      {links.map((link) => {
        const isActive = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isActive
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {link.name}
          </Link>
        )
      })}
    </div>
  )
}
