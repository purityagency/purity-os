"use client"

import type { Session } from "next-auth"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function ClientSidebar({ session }: { session: Session }) {
  const pathname = usePathname()

  const navLinks = [
    {
      name: "Aperçu",
      href: "/dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      )
    },
    {
      name: "Timeline",
      href: "/dashboard/timeline",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    },
    {
      name: "Fichiers",
      href: "/dashboard/documents",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M10 9H8" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
        </svg>
      )
    },
    {
      name: "Messages",
      href: "/dashboard/messages",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    },
    {
      name: "Paiements",
      href: "/dashboard/payments",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      )
    }
  ]

  return (
    <aside className="w-64 border-r border-white/5 bg-[#060309]/80 backdrop-blur-md hidden md:flex flex-col relative">
      <div className="p-6">
        {/* Animated OctoMask SVG Logo */}
        <div className="flex items-center gap-3 mb-8 group">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center octo-anim-breath overflow-hidden">
            <svg className="w-8 h-8 text-[#7C3AED]" viewBox="0 0 100 100" fill="none">
              <defs>
                <linearGradient id="octoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#C084FC" />
                </linearGradient>
              </defs>
              {/* Face/Mask */}
              <circle cx="50" cy="45" r="18" fill="url(#octoGrad)" className="opacity-90" />
              <path d="M38 42 C 42 48, 48 48, 50 42 C 52 48, 58 48, 62 42" stroke="#060309" strokeWidth="3" strokeLinecap="round" />
              {/* Eyes */}
              <circle cx="43" cy="39" r="3" fill="#fff" />
              <circle cx="57" cy="39" r="3" fill="#fff" />
              {/* Tentacles */}
              <path d="M35 55 Q 25 65 30 75" stroke="url(#octoGrad)" strokeWidth="3" strokeLinecap="round" className="octo-anim-wave1" />
              <path d="M50 63 Q 50 78 55 83" stroke="url(#octoGrad)" strokeWidth="3" strokeLinecap="round" className="octo-anim-breath" />
              <path d="M65 55 Q 75 65 70 75" stroke="url(#octoGrad)" strokeWidth="3" strokeLinecap="round" className="octo-anim-wave2" />
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-none tracking-tight group-hover:text-[#7C3AED] transition-colors">Purity OS</div>
            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1">Espace Client</div>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="space-y-1.5">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href))
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-purple-500/10 border-purple-500/20 text-[#C084FC] shadow-[0_0_15px_-3px_rgba(124,58,237,0.2)]"
                    : "bg-transparent border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                }`}
              >
                {link.icon}
                <span>{link.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer Profile */}
      <div className="mt-auto p-6 border-t border-white/5 bg-black/20">
        <div className="mb-4">
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Compte Client</span>
          <span className="text-zinc-200 truncate block font-medium text-xs mt-1" title={session?.user?.email || ""}>
            {session?.user?.email}
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-400 transition-all duration-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
