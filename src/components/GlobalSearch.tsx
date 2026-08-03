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
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10)
    else {
      setQuery("")
      setResults(EMPTY)
      setActiveIndex(0)
    }
  }, [open])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(EMPTY)
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
        // Requête annulée (nouvelle frappe) — pas une vraie erreur à afficher.
      }
    }, 250)
    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  const flatItems = [
    ...results.clients.map((c) => ({ type: "client" as const, href: `/admin/clients/${c.id}`, label: c.name || c.email, sub: c.email })),
    ...results.projects.map((p) => ({ type: "project" as const, href: `/admin/projects/${p.id}`, label: p.name, sub: p.client.name || p.client.email })),
    ...results.leads.map((l) => ({ type: "lead" as const, href: `/admin/acquisition`, label: l.companyName, sub: l.status })),
  ]

  function go(href: string) {
    setOpen(false)
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
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-400 hover:bg-white/10 transition-colors"
      >
        <span>Rechercher…</span>
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/10">⌘K</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a050f] shadow-2xl overflow-hidden">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Chercher un client, un projet, un lead…"
              className="w-full px-4 py-3.5 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none border-b border-white/10"
            />
            {query.trim().length >= 2 && (
              <div className="max-h-80 overflow-y-auto py-2">
                {flatItems.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-zinc-500 text-center">Aucun résultat.</p>
                ) : (
                  <>
                    {results.clients.length > 0 && <GroupLabel label="Clients" />}
                    {results.clients.map((c) => (
                      <ResultRow
                        key={c.id}
                        active={flatItems[activeIndex]?.href === `/admin/clients/${c.id}`}
                        label={c.name || c.email}
                        sub={c.email}
                        onClick={() => go(`/admin/clients/${c.id}`)}
                      />
                    ))}
                    {results.projects.length > 0 && <GroupLabel label="Projets" />}
                    {results.projects.map((p) => (
                      <ResultRow
                        key={p.id}
                        active={flatItems[activeIndex]?.href === `/admin/projects/${p.id}`}
                        label={p.name}
                        sub={p.client.name || p.client.email}
                        onClick={() => go(`/admin/projects/${p.id}`)}
                      />
                    ))}
                    {results.leads.length > 0 && <GroupLabel label="Leads (Acquisition)" />}
                    {results.leads.map((l) => (
                      <ResultRow
                        key={l.id}
                        active={false}
                        label={l.companyName}
                        sub={l.status}
                        onClick={() => go(`/admin/acquisition`)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function GroupLabel({ label }: { label: string }) {
  return <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
}

function ResultRow({
  label,
  sub,
  active,
  onClick,
}: {
  label: string
  sub: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-left transition-colors ${
        active ? "bg-white/10" : "hover:bg-white/5"
      }`}
    >
      <span className="text-sm text-white truncate">{label}</span>
      <span className="text-xs text-zinc-500 truncate shrink-0 max-w-[40%]">{sub}</span>
    </button>
  )
}
