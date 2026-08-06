"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { InboxIcon, MailIcon, OverviewIcon, TableIcon, SparklesIcon } from "@/components/icons"
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
    { name: "Inbox", href: "/admin/ai/acquisition/inbox", Icon: InboxIcon, badge: 0 },
    { name: "Outbox", href: "/admin/ai/acquisition/outbox", Icon: MailIcon },
    { name: "CRM", href: "/admin/ai/acquisition/crm", Icon: TableIcon },
    { name: "Brouillons", href: "/admin/ai/acquisition/drafts", Icon: SparklesIcon },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      {/* Liquid Glass Command Bar */}
      <div 
        className={`shrink-0 flex items-center justify-between px-6 py-4 sticky top-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? "bg-[#060309]/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl shadow-black" 
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 rounded-xl p-1 shadow-inner shadow-white/5">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href
            const Icon = tab.Icon
            return (
              <Link key={tab.href} href={tab.href}>
                <div
                  className={`group relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer overflow-hidden ${
                    isActive
                      ? "bg-gradient-to-r from-violet-600/40 to-violet-500/10 text-white shadow-md shadow-violet-900/20"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {/* Subtle active indicator border */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-lg border border-violet-400/30"></div>
                  )}
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-violet-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                  <span>{tab.name}</span>
                  
                  {/* Optional Badge */}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[9px] text-white">
                      {tab.badge}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>

        {/* Right side contextual actions or status */}
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <span>P01 Active</span>
          </div>
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
