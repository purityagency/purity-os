"use client"

import Link from "next/link"
import type { Session } from "next-auth"
import { usePathname } from "next/navigation"

export function AdminSidebar({ session }: { session: Session }) {
  const pathname = usePathname()

  const navItems = [
    { name: "Vue d'ensemble", href: "/admin" },
    { name: "Projets & Clients", href: "/admin/projects" },
    { name: "Documents", href: "/admin/documents" },
    { name: "Paiements", href: "/admin/payments" },
  ]

  return (
    <aside className="w-64 border-r border-white/10 bg-[#0a050f] hidden md:flex flex-col">
      <div className="p-6">
        <div className="text-[#7C3AED] font-bold text-xl mb-1">Purity OS</div>
        <div className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Espace Agence</div>
        <div className="mt-8 space-y-2 text-sm text-zinc-400">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link key={item.name} href={item.href} className="block">
                <div className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${isActive ? 'bg-[#7C3AED]/20 text-[#7C3AED] font-medium' : 'hover:text-white hover:bg-white/5'}`}>
                  {item.name}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
      <div className="mt-auto p-6 border-t border-white/10 text-sm text-zinc-400">
        Connecté en tant que<br />
        <span className="text-white truncate block font-medium">{session?.user?.email}</span>
      </div>
    </aside>
  )
}
