"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import type { Session } from "next-auth"

export function MobileHeader({ session, isAdmin = false }: { session: Session; isAdmin?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const clientLinks = [
    { name: "Mon Projet", href: "/dashboard" },
    { name: "Avancement", href: "/dashboard/timeline" },
    { name: "Photos & Documents", href: "/dashboard/documents" },
    { name: "Discussions", href: "/dashboard/messages" },
    { name: "Factures & Règlement", href: "/dashboard/payments" },
  ]

  const adminLinks = [
    { name: "Vue d'ensemble", href: "/admin" },
    { name: "Acquisition (IA)", href: "/admin/ai/acquisition" },
    { name: "Clients", href: "/admin/clients" },
    { name: "Documents", href: "/admin/documents" },
    { name: "Paiements", href: "/admin/payments" },
    { name: "Paramètres", href: "/admin/settings" },
  ]

  const links = isAdmin ? adminLinks : clientLinks

  return (
    <header className="md:hidden sticky top-0 z-50 bg-[#060309]/95 backdrop-blur-md border-b border-white/10 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link href={isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-[#7C3AED]" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="45" r="18" fill="#7C3AED" className="opacity-90" />
              <circle cx="43" cy="39" r="3" fill="#fff" />
              <circle cx="57" cy="39" r="3" fill="#fff" />
              <path d="M35 55 Q 25 65 30 75" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" />
              <path d="M50 63 Q 50 78 55 83" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" />
              <path d="M65 55 Q 75 65 70 75" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <span className="text-white font-bold text-base leading-none">Purity OS</span>
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest block">
              {isAdmin ? "Espace Agence" : "Espace Client"}
            </span>
          </div>
        </Link>

        {/* Hamburger Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
        >
          {isOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {isOpen && (
        <nav className="mt-3 pt-3 border-t border-white/10 space-y-1 animate-in slide-in-from-top-2 duration-200">
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/dashboard" && link.href !== "/admin" && pathname.startsWith(link.href))
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  isActive
                    ? "bg-purple-500/10 border-purple-500/20 text-[#C084FC] font-semibold"
                    : "bg-transparent border-transparent text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            )
          })}

          <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400 px-2">
            <span className="truncate max-w-[180px]">{session?.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-xs hover:bg-red-500/20 transition-all"
            >
              Déconnexion
            </button>
          </div>
        </nav>
      )}
    </header>
  )
}
