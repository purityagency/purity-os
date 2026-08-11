"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { InboxIcon, MailIcon, OverviewIcon, TableIcon, SparklesIcon, PhoneIcon } from "@/components/icons"
import { useState, useEffect } from "react"

export default function AcquisitionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = document.getElementById("acquisition-content-area")?.scrollTop || 0
      setIsScrolled(scrollY > 10)
    }
    const container = document.getElementById("acquisition-content-area")
    container?.addEventListener("scroll", handleScroll)
    return () => container?.removeEventListener("scroll", handleScroll)
  }, [])

  const TABS = [
    { name: "Cockpit", href: "/admin/ai/acquisition", Icon: OverviewIcon },
    { name: "Leads CRM", href: "/admin/ai/acquisition/crm", Icon: TableIcon },
    { name: "Brouillons", href: "/admin/ai/acquisition/drafts", Icon: SparklesIcon },
    { name: "Appels", href: "/admin/ai/acquisition/calls", Icon: PhoneIcon },
    { name: "Réponses", href: "/admin/ai/acquisition/inbox", Icon: InboxIcon },
    { name: "Envoyés", href: "/admin/ai/acquisition/outbox", Icon: MailIcon },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-[#0a0a0b]">
      {/* Sub-Navigation Header Bar */}
      <div
        className={`shrink-0 flex items-center justify-between gap-3 px-4 sm:px-8 py-2.5 sticky top-0 z-50 bg-[#0a0a0b] border-b transition-colors ${
          isScrolled ? "border-white/10" : "border-white/[0.06]"
        }`}
      >
        <div className="flex items-center gap-1 bg-[#141417] border border-white/[0.08] rounded-xl p-1 overflow-x-auto max-w-full custom-scrollbar">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href
            const Icon = tab.Icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                style={isActive ? { background: "#c4f82a", color: "#000" } : undefined}
                className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "shadow-sm shadow-[#c4f82a]/20"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-black" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                <span>{tab.name}</span>
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#c4f82a]" />
          <span className="hidden sm:inline">VPS Strasbourg En Ligne</span>
        </div>
      </div>

      {/* Main Content Scroll Container */}
      <div
        id="acquisition-content-area"
        className="flex-1 overflow-y-auto bg-[#0a0a0b] custom-scrollbar"
      >
        <div className="min-h-full">
          {children}
        </div>
      </div>
    </div>
  )
}
