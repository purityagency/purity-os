"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { InboxIcon, MailIcon, OverviewIcon, TableIcon, SparklesIcon, PhoneIcon } from "@/components/icons"
import { useState, useEffect } from "react"

export default function AcquisitionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)

  // Subtle blur effect on scroll
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
    { name: "Overview", href: "/admin/ai/acquisition", Icon: OverviewIcon },
    { name: "Inbox", href: "/admin/ai/acquisition/inbox", Icon: InboxIcon },
    { name: "Outbox", href: "/admin/ai/acquisition/outbox", Icon: MailIcon },
    { name: "Appels", href: "/admin/ai/acquisition/calls", Icon: PhoneIcon },
    { name: "CRM", href: "/admin/ai/acquisition/crm", Icon: TableIcon },
    { name: "Brouillons", href: "/admin/ai/acquisition/drafts", Icon: SparklesIcon },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      {/* Barre de navigation — surface noire opaque, bordure nette (pas de
          glassmorphism ni de glow, conformément à la direction visuelle). */}
      <div
        className={`shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sticky top-0 z-50 bg-[#060309] border-b transition-colors ${
          isScrolled ? "border-white/10" : "border-white/5"
        }`}
      >
        <div className="flex items-center gap-1 bg-white/[0.02] border border-white/10 rounded-xl p-1 overflow-x-auto max-w-full" style={{ scrollbarWidth: "none" }}>
          {TABS.map((tab) => {
            const isActive = pathname === tab.href
            const Icon = tab.Icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`group flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  isActive ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                <span className="hidden sm:inline">{tab.name}</span>
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="hidden sm:inline">Pôle 01 actif</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        id="acquisition-content-area"
        className="flex-1 overflow-y-auto bg-[#060309] custom-scrollbar"
      >
        <div className="min-h-full">
          {children}
        </div>
      </div>
    </div>
  )
}
