"use client"

import type { Session } from "next-auth"
import { signOut } from "next-auth/react"

export function ClientSidebar({ session }: { session: Session }) {
  return (
    <aside className="w-64 border-r border-white/10 bg-[#0a050f] hidden md:flex flex-col relative">
      <div className="p-6">
        <div className="text-[#7C3AED] font-bold text-xl mb-1">Purity OS</div>
        <div className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Espace Client</div>
        <div className="mt-8 space-y-4 text-sm text-zinc-400">
          <div className="text-white hover:text-[#7C3AED] cursor-pointer transition-colors">Aperçu</div>
          <div className="hover:text-[#7C3AED] cursor-pointer transition-colors">Timeline</div>
          <div className="hover:text-[#7C3AED] cursor-pointer transition-colors">Fichiers</div>
        </div>
      </div>
      
      <div className="mt-auto p-6 border-t border-white/10 text-sm text-zinc-400">
        <div className="mb-4">
          Connecté en tant que<br />
          <span className="text-white truncate block font-medium">{session?.user?.email}</span>
        </div>
        <button 
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full px-4 py-2 text-xs font-semibold rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
        >
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
