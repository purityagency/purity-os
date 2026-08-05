"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

type SearchResults = {
  clients: { id: string; name: string | null; email: string }[]
  projects: { id: string; name: string; client: { name: string | null; email: string } }[]
  leads: { id: string; companyName: string; status: string }[]
}

const EMPTY: SearchResults = { clients: [], projects: [], leads: [] }

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults>(EMPTY)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === "Escape") closeSearch()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  function closeSearch() {
    setOpen(false)
    setQuery("")
    setResults(EMPTY)
    setActiveIndex(0)
  }

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 15)
  }, [open])

  useEffect(() => {
    if (query.trim().length < 2) {
      return
    }
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        const data = await res.json()
        setResults(data)
        setActiveIndex(0)
      } catch {
        // Aborted request
      }
    }, 200)
    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  const flatItems = [
    ...results.clients.map((c) => ({ type: "client" as const, href: `/admin/clients/${c.id}`, label: c.name || c.email, sub: c.email, icon: "👤" })),
    ...results.projects.map((p) => ({ type: "project" as const, href: `/admin/projects/${p.id}`, label: p.name, sub: p.client.name || p.client.email, icon: "📐" })),
    ...results.leads.map((l) => ({ type: "lead" as const, href: `/admin/ai/acquisition`, label: l.companyName, sub: `Statut: ${l.status}`, icon: "🎯" })),
  ]

  function go(href: string) {
    closeSearch()
    router.push(href)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && flatItems[activeIndex]) {
      e.preventDefault()
      go(flatItems[activeIndex].href)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-white/10 bg-black/30 hover:bg-white/5 hover:border-violet-500/30 text-xs text-zinc-400 hover:text-zinc-200 transition-all group cursor-pointer shadow-inner"
      >
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 group-hover:text-violet-400 transition-colors">🔍</span>
          <span>Rechercher…</span>
        </div>
        <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-400 group-hover:bg-violet-500/20 group-hover:text-violet-300 transition-all border border-white/5">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md animate-fade-in" onClick={closeSearch} />
          <div className="relative w-full max-w-xl rounded-2xl border border-white/15 bg-[#0a050f]/95 backdrop-blur-2xl shadow-2xl shadow-violet-950/40 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center px-4 border-b border-white/10 bg-white/[0.02]">
              <span className="text-zinc-400 mr-3 text-sm">🔍</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Chercher un client, un projet, un lead qualifié…"
                className="w-full py-4 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
              />
              <kbd className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.5 rounded border border-white/10 bg-white/5">
                ESC
              </kbd>
            </div>

            {query.trim().length >= 2 ? (
              <div className="max-h-96 overflow-y-auto p-2 space-y-3">
                {flatItems.length === 0 ? (
                  <p className="px-4 py-8 text-xs text-zinc-500 text-center">Aucun résultat trouvé pour &quot;{query}&quot;.</p>
                ) : (
                  <>
                    {results.clients.length > 0 && (
                      <GroupSection title="Clients" count={results.clients.length}>
                        {results.clients.map((c) => {
                          const item = flatItems.find(i => i.href === `/admin/clients/${c.id}`)
                          const active = flatItems[activeIndex] === item
                          return (
                            <ResultRow
                              key={c.id}
                              active={active}
                              icon="👤"
                              label={c.name || c.email}
                              sub={c.email}
                              onClick={() => go(`/admin/clients/${c.id}`)}
                            />
                          )
                        })}
                      </GroupSection>
                    )}

                    {results.projects.length > 0 && (
                      <GroupSection title="Projets" count={results.projects.length}>
                        {results.projects.map((p) => {
                          const item = flatItems.find(i => i.href === `/admin/projects/${p.id}`)
                          const active = flatItems[activeIndex] === item
                          return (
                            <ResultRow
                              key={p.id}
                              active={active}
                              icon="📐"
                              label={p.name}
                              sub={p.client.name || p.client.email}
                              onClick={() => go(`/admin/projects/${p.id}`)}
                            />
                          )
                        })}
                      </GroupSection>
                    )}

                    {results.leads.length > 0 && (
                      <GroupSection title="Leads (Acquisition)" count={results.leads.length}>
                        {results.leads.map((l) => (
                          <ResultRow
                            key={l.id}
                            active={false}
                            icon="🎯"
                            label={l.companyName}
                            sub={`Statut: ${l.status}`}
                            onClick={() => go(`/admin/ai/acquisition`)}
                          />
                        ))}
                      </GroupSection>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-zinc-500 space-y-2">
                <p>Saisissez au moins 2 caractères pour lancer la recherche SSOT.</p>
                <div className="flex items-center justify-center gap-4 text-[10px] font-mono text-zinc-600 pt-2">
                  <span>↑↓ Naviguer</span>
                  <span>↵ Ouvrir</span>
                  <span>ESC Fermer</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function GroupSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-3 py-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">{title}</span>
        <span className="text-[10px] font-mono text-zinc-600">{count}</span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function ResultRow({
  icon,
  label,
  sub,
  active,
  onClick,
}: {
  icon: string
  label: string
  sub: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
        active
          ? "bg-violet-600/20 text-white border border-violet-500/30 shadow-sm"
          : "text-zinc-300 hover:bg-white/5 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-sm shrink-0">{icon}</span>
        <span className="text-xs font-medium truncate">{label}</span>
      </div>
      <span className="text-[10px] font-mono text-zinc-500 truncate shrink-0 max-w-[45%]">{sub}</span>
    </button>
  )
}
