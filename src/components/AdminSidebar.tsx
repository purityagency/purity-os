"use client"

import Link from "next/link"
import type { Session } from "next-auth"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { GlobalSearch } from "./GlobalSearch"
import {
  OverviewIcon,
  InboxIcon,
  UsersIcon,
  ProjectsIcon,
  PaymentsIcon,
  DocumentsIcon,
  EcosystemIcon,
  AcquisitionIcon,
  FinanceIcon,
  SettingsIcon,
  SparklesIcon,
} from "./icons"

interface NavItem {
  name: string
  poleBadge?: string
  href: string
  IconComponent: React.ComponentType<{ className?: string }>
}

interface NavGroup {
  title: string
  items: NavItem[]
}

export function AdminSidebar({ session }: { session: Session }) {
  const pathname = usePathname()

  const navGroups: NavGroup[] = [
    {
      title: "PILOTAGE CENTRAL",
      items: [
        { name: "Orchestration & Flotte", poleBadge: "CTRL", href: "/admin/ai/orchestration", IconComponent: SparklesIcon },
        { name: "Vue d'ensemble", href: "/admin", IconComponent: OverviewIcon },
        { name: "Boîte de réception", href: "/admin/inbox", IconComponent: InboxIcon },
        { name: "Clients", href: "/admin/clients", IconComponent: UsersIcon },
        { name: "Projets & Livrables", href: "/admin/projects", IconComponent: ProjectsIcon },
        { name: "Factures", href: "/admin/invoices", IconComponent: DocumentsIcon },
        { name: "Paiements & Trésorerie", href: "/admin/payments", IconComponent: PaymentsIcon },
        { name: "Coffre Documents", href: "/admin/documents", IconComponent: DocumentsIcon },
      ]
    },
    {
      title: "MATRICE DES 7 PÔLES IA",
      items: [
        { name: "Arbre & Organigramme IA", poleBadge: "ALL", href: "/admin/ai/ecosystem", IconComponent: EcosystemIcon },
        { name: "Direction & COO Kernel", poleBadge: "P00", href: "/admin/ai/coo", IconComponent: OverviewIcon },
        { name: "Acquisition & Prospection", poleBadge: "P01", href: "/admin/ai/acquisition", IconComponent: AcquisitionIcon },
        { name: "Finance & Administration", poleBadge: "P02", href: "/admin/ai/finance", IconComponent: FinanceIcon },
        { name: "Ops & Conformité", poleBadge: "P03", href: "/admin/ai/ops", IconComponent: SettingsIcon },
        { name: "Production Digitale", poleBadge: "P04", href: "/admin/ai/production", IconComponent: ProjectsIcon },
        { name: "Ventes & Clients", poleBadge: "P05", href: "/admin/ai/ventes", IconComponent: UsersIcon },
        { name: "Stratégie & Data", poleBadge: "P06", href: "/admin/ai/strategie", IconComponent: SparklesIcon },
      ]
    },
    {
      title: "RÉGLAGES & CONFORMITÉ",
      items: [
        { name: "Paramètres OS & Sentinel", href: "/admin/settings", IconComponent: SettingsIcon },
      ]
    }
  ]

  return (
    <aside className="w-64 border-r border-white/10 bg-[#08040d]/90 backdrop-blur-2xl hidden md:flex flex-col shrink-0 select-none h-screen sticky top-0 overflow-hidden">
      {/* Brand Header */}
      <div className="p-4 border-b border-white/5 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-violet-600/30 text-sm">
              P
            </div>
            <div>
              <div className="font-bold text-white text-sm leading-tight tracking-tight flex items-center gap-1">
                <span>Purity OS</span>
                <SparklesIcon className="w-3 h-3 text-violet-400" />
              </div>
              <div className="text-[10px] text-violet-400 font-mono font-medium tracking-wider">v2.5 · 7 Pôles SSOT</div>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Kernel Active" />
        </div>

        {/* Global Search command bar trigger */}
        <GlobalSearch />
      </div>

      {/* Navigation list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5 text-xs font-medium scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <div className="px-2 text-[9px] font-bold tracking-widest text-zinc-500 uppercase font-mono">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item, idx) => {
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                const Icon = item.IconComponent
                return (
                  <Link key={`${item.name}-${idx}`} href={item.href} className="block">
                    <div
                      className={`relative flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-violet-600/25 to-violet-500/10 text-white font-semibold border border-violet-500/30 shadow-sm shadow-violet-500/10'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? 'text-violet-400' : 'text-zinc-500'}`} />
                        <span className="truncate text-xs">{item.name}</span>
                      </div>

                      {item.poleBadge && (
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                          isActive ? "bg-violet-500/30 text-violet-200 border border-violet-500/40" : "bg-white/5 text-zinc-500 border border-white/5"
                        }`}>
                          {item.poleBadge}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer User Info & Status */}
      <div className="p-3 border-t border-white/5 space-y-2 bg-black/30 shrink-0">
        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Sentinel 100% OK
          </span>
          <span className="text-zinc-600">BE-WAL</span>
        </div>

        <div className="p-2 rounded-lg border border-white/5 bg-white/[0.02] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] text-zinc-500 uppercase font-mono">Session Admin</p>
            <p className="text-xs font-semibold text-white truncate">{session?.user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors shrink-0 cursor-pointer text-xs"
            title="Déconnexion"
          >
            ✕
          </button>
        </div>
      </div>
    </aside>
  )
}
