"use client"

import { useState } from "react"
import Link from "next/link"

interface ActionItem {
  id: string
  href: string
  label: string
  context: string
  badge: string
  tone: "critical" | "warning"
  icon: string
}

interface EventItem {
  id: string
  name: string
  summary: string
  type: string
  typeLabel: string
  typeColor: string
  time: string
  href: string
}

interface AiEventItem {
  id: string
  summary: string
  name: string
  type: string
  typeLabel: string
  typeColor: string
  time: string
  href: string
}

interface Props {
  actionItems: ActionItem[]
  recentEvents: EventItem[]
  recentAiEvents: AiEventItem[]
}

const TABS = [
  { id: "actions",  label: "Action Center",   icon: "⚠️" },
  { id: "inbox",    label: "Demandes Clients", icon: "📩" },
  { id: "ai_stream",label: "Flux IA & Kernel", icon: "🤖" },
]

export function DashboardTabs({ actionItems, recentEvents, recentAiEvents }: Props) {
  const [activeTab, setActiveTab] = useState<"actions" | "inbox" | "ai_stream">(
    actionItems.length > 0 ? "actions" : "inbox"
  )

  return (
    <div className="border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-xl space-y-4">
      {/* Tab bar Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-lg p-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const count =
              tab.id === "actions"
                ? actionItems.length
                : tab.id === "inbox"
                ? recentEvents.length
                : recentAiEvents.length

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                      isActive
                        ? "bg-white/20 text-white"
                        : tab.id === "actions"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-white/10 text-zinc-400"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {activeTab === "inbox" && (
          <Link href="/admin/inbox" className="text-xs text-violet-400 hover:underline font-mono">
            Ouvrir la boîte →
          </Link>
        )}
        {activeTab === "ai_stream" && (
          <Link href="/admin/inbox?type=AI" className="text-xs text-violet-400 hover:underline font-mono">
            Journal complet →
          </Link>
        )}
      </div>

      {/* Tab Content Panels */}
      <div>
        {/* Action Center */}
        {activeTab === "actions" && (
          <div>
            {actionItems.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-lg bg-black/20">
                <p className="text-sm font-semibold text-emerald-400 mb-1">✅ Aucun blocage en cours</p>
                <p className="text-xs text-zinc-500">Tous les projets avancent selon leur planning.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[380px] overflow-y-auto pr-1">
                {actionItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center justify-between gap-3 p-3 hover:bg-white/[0.03] transition-colors rounded-lg group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm shrink-0">{item.icon}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-white group-hover:text-violet-300 transition-colors truncate">
                          {item.label}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate">{item.context}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                        item.tone === "critical"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {item.badge}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Demandes Clients */}
        {activeTab === "inbox" && (
          <div>
            {recentEvents.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-lg bg-black/20">
                <p className="text-xs text-zinc-500">Aucune demande client récente.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[380px] overflow-y-auto pr-1">
                {recentEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={event.href}
                    className="flex items-center justify-between gap-3 p-3 hover:bg-white/[0.03] transition-colors rounded-lg group"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-white group-hover:text-violet-300 transition-colors truncate">
                        {event.name}
                      </p>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">{event.summary}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-semibold ${event.typeColor}`}>
                        {event.typeLabel}
                      </span>
                      <p className="text-[9px] text-zinc-500 font-mono mt-0.5">{event.time}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Flux IA */}
        {activeTab === "ai_stream" && (
          <div>
            {recentAiEvents.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-lg bg-black/20">
                <p className="text-xs text-zinc-500">Aucun log IA récent.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[380px] overflow-y-auto pr-1">
                {recentAiEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={event.href}
                    className="flex items-center justify-between gap-3 p-3 hover:bg-white/[0.03] transition-colors rounded-lg group"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-white group-hover:text-violet-300 transition-colors truncate">
                        {event.summary}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono truncate mt-0.5">{event.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-semibold ${event.typeColor}`}>
                        {event.typeLabel}
                      </span>
                      <p className="text-[9px] text-zinc-500 font-mono mt-0.5">{event.time}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
