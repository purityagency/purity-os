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

  // Pastilles de notification : compteurs d'actions en attente, rafraîchis au
  // montage, toutes les 60 s, au changement d'onglet et au retour sur la fenêtre.
  const [badges, setBadges] = useState<{ drafts: number; replies: number; callable: number }>({ drafts: 0, replies: 0, callable: 0 })
  useEffect(() => {
    let alive = true
    const load = () =>
      fetch("/api/admin/acquisition/badges", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (alive && d) setBadges(d) })
        .catch(() => {})
    load()
    const iv = setInterval(load, 60_000)
    const onFocus = () => load()
    window.addEventListener("focus", onFocus)
    return () => { alive = false; clearInterval(iv); window.removeEventListener("focus", onFocus) }
  }, [pathname])

  const TABS = [
    { name: "Cockpit", href: "/admin/ai/acquisition", Icon: OverviewIcon, badge: 0 },
    { name: "Leads CRM", href: "/admin/ai/acquisition/crm", Icon: TableIcon, badge: 0 },
    { name: "Brouillons", href: "/admin/ai/acquisition/drafts", Icon: SparklesIcon, badge: badges.drafts },
    { name: "Appels", href: "/admin/ai/acquisition/calls", Icon: PhoneIcon, badge: badges.callable },
    { name: "Réponses", href: "/admin/ai/acquisition/inbox", Icon: InboxIcon, badge: badges.replies },
    { name: "Envoyés", href: "/admin/ai/acquisition/outbox", Icon: MailIcon, badge: 0 },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-[#09090b]">
      {/* Barre de navigation — Tactical HQ */}
      <div
        className={`shrink-0 flex items-center justify-between gap-3 px-4 sm:px-8 py-2.5 sticky top-0 z-50 bg-[#09090b] border-b transition-colors ${
          isScrolled ? "border-zinc-800 shadow-sm" : "border-zinc-800/50"
        }`}
      >
        <div className="flex items-center gap-1 overflow-x-auto max-w-full custom-scrollbar">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href
            const Icon = tab.Icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-zinc-100" : "text-zinc-600 group-hover:text-zinc-400"}`} />
                <span>{tab.name}</span>
                {tab.badge > 0 && (
                  <span
                    className={`ml-1 min-w-[18px] h-4.5 px-1.5 grid place-items-center rounded bg-red-500 text-white text-[10px] font-black tracking-widest shadow-[0_0_8px_rgba(239,68,68,0.5)]`}
                  >
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="hidden sm:inline">Tactical Pôle Actif</span>
        </div>
      </div>

      {/* Conteneur de contenu */}
      <div id="acquisition-content-area" className="flex-1 overflow-y-auto bg-[#09090b] custom-scrollbar">
        <div className="min-h-full p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  )
}
