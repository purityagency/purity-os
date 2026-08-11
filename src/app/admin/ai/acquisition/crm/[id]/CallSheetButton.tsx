"use client"

import { useState, useEffect } from "react"
import { getCallSheet, type CallSheetData } from "@/actions/acquisitionActions"
import { CopyButton } from "./CopyButton"

const TABS = ["Dossier", "Mental", "Script", "Objections", "Après"] as const
type Tab = (typeof TABS)[number]

export function CallSheetButton({ leadId, label = "📞 Fiche d'appel", className }: { leadId: string; label?: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<CallSheetData | null>(null)
  const [loading, setLoading] = useState(false)

  async function openSheet() {
    setOpen(true)
    if (!data) {
      setLoading(true)
      try {
        setData(await getCallSheet(leadId))
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className={className ?? "text-[11px] font-mono px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 transition-colors whitespace-nowrap cursor-pointer"}
      >
        {label}
      </button>
      {open && <Drawer onClose={() => setOpen(false)} data={data} loading={loading} leadId={leadId} />}
    </>
  )
}

function Drawer({ data, loading, onClose, leadId }: { data: CallSheetData | null; loading: boolean; onClose: () => void; leadId: string }) {
  const [tab, setTab] = useState<Tab>("Dossier")

  // Échap pour fermer + verrou de scroll de l'arrière-plan (standard des modals
  // modernes : Linear, Raycast, Vercel).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const scoreColor = data?.score == null ? "text-zinc-500" : data.score >= 70 ? "text-emerald-400" : data.score >= 40 ? "text-amber-400" : "text-red-400"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-4xl max-h-[88vh] rounded-2xl border border-white/10 bg-[#0b0710] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-[popIn_.16s_cubic-bezier(.16,1,.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes popIn{from{transform:scale(.97);opacity:0}to{transform:scale(1);opacity:1}}`}</style>

        {/* Header */}
        <div className="shrink-0 px-6 pt-5 pb-4 border-b border-white/[0.07] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-1">Fiche d&apos;appel</div>
            <h2 className="text-2xl font-bold text-white tracking-tight truncate">{data?.companyName ?? "…"}</h2>
            {data && (
              <div className="mt-1.5 flex items-center gap-3 text-xs text-zinc-400">
                {data.location && <span>{data.location}</span>}
                {data.score != null && <span className={`font-mono font-semibold ${scoreColor}`}>Score {data.score}</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {data?.phone && (
              <a href={`tel:${data.phone.dial}`} className="text-sm font-semibold text-white px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition-colors">Appeler · {data.phone.display}</a>
            )}
            <button type="button" onClick={onClose} aria-label="Fermer" className="w-9 h-9 rounded-xl border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white grid place-items-center cursor-pointer transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>

        {/* Tabs — segmented, sobre */}
        <div className="shrink-0 px-4 pt-3">
          <div className="inline-flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            {TABS.map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${tab === t ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}>{t}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
          {loading || !data ? (
            <div className="h-40 grid place-items-center text-sm text-zinc-500">Préparation de la fiche…</div>
          ) : (
            <>
              {tab === "Dossier" && <DossierTab data={data} leadId={leadId} />}
              {tab === "Mental" && <MentalTab data={data} />}
              {tab === "Script" && <ScriptTab data={data} />}
              {tab === "Objections" && <ObjectionsTab data={data} />}
              {tab === "Après" && <AfterTab data={data} leadId={leadId} />}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="shrink-0 px-6 py-2.5 border-t border-white/[0.07] flex items-center justify-between text-[10px] font-mono text-zinc-600">
          <span>Préparé sans IA · données réelles du prospect</span>
          <span>Échap pour fermer</span>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">{children}</h3>
}

function DossierTab({ data, leadId }: { data: CallSheetData; leadId: string }) {
  const k = data.kit
  const shot = data.websiteUrl ? `https://image.thum.io/get/width/700/crop/900/noanimate/${data.websiteUrl}` : null
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#c4f82a]/25 bg-[#c4f82a]/10 p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#c4f82a] mb-1">Angle d&apos;accroche</div>
        <p className="text-sm text-white leading-relaxed">{k.oneLiner}</p>
      </div>

      <div>
        <SectionTitle>Dossier</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {k.dossier.map((r, i) => (
            <div key={i} className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
              <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">{r.label}</div>
              <div className="text-xs text-zinc-200 truncate">{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      {k.findings.length > 0 && (
        <div>
          <SectionTitle>Ce qui le fait perdre des clients</SectionTitle>
          <ul className="space-y-1.5">
            {k.findings.slice(0, 3).map((f, i) => (
              <li key={i} className="text-sm text-zinc-300 flex gap-2"><span className={f.severity === "critique" ? "text-red-400" : "text-amber-400"}>▹</span><span>{f.title}</span></li>
            ))}
          </ul>
        </div>
      )}

      {shot && (
        <div>
          <SectionTitle>Aperçu de son site</SectionTitle>
          <a href={data.websiteUrl!} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-white/10 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot} alt="" loading="lazy" className="w-full h-auto block" />
          </a>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <a href={`/admin/ai/acquisition/crm/${leadId}/audit`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10">📄 PDF d&apos;audit</a>
        <a href={`/admin/ai/acquisition/crm/${leadId}/deck`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10">🖥️ Deck</a>
        {data.googleMapsUrl && <a href={data.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10">📍 Maps</a>}
      </div>
    </div>
  )
}

function MentalTab({ data }: { data: CallSheetData }) {
  const m = data.kit.mechanics
  const rows: [string, string][] = [
    ["Parole / écoute", m.talkListen],
    ["Monologue max", m.monologueMax],
    ["Questions", m.questionTarget],
    ["Meilleur créneau", m.bestWindow],
    ["Persévérance", m.persistence],
    ["Ton & rythme", m.tone],
  ]
  return (
    <div className="space-y-5">
      <div>
        <SectionTitle>Mécanique de l&apos;appel (données Gong.io & terrain)</SectionTitle>
        <div className="space-y-2">
          {rows.map(([label, val], i) => (
            <div key={i} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/80 mb-0.5">{label}</div>
              <div className="text-sm text-zinc-300">{val}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <SectionTitle>Leviers psychologiques (à utiliser sur CET appel)</SectionTitle>
        <div className="space-y-2.5">
          {data.kit.psychology.map((p, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-bold text-white">{p.name}</span>
              </div>
              <div className="text-[10px] font-mono text-[#c4f82a]/80 mb-1.5">{p.source}</div>
              <div className="text-xs text-zinc-400 mb-1.5"><span className="text-zinc-500">Quand :</span> {p.when}</div>
              <div className="text-sm text-zinc-200 border-l-2 border-emerald-500/40 pl-3 italic">{p.example}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Line({ label, text, copy }: { label: string; text: string; copy?: boolean }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{label}</div>
        {copy && <CopyButton text={text} label="Copier" />}
      </div>
      <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  )
}

function ScriptTab({ data }: { data: CallSheetData }) {
  const s = data.kit.callScript
  const o = data.kit.openers
  return (
    <div className="space-y-5">
      <div>
        <SectionTitle>Ouverture — 3 variantes (choisis selon le feeling)</SectionTitle>
        <div className="space-y-2">
          <Line label="⭐ Pattern interrupt (recommandé)" text={o.patternInterrupt} copy />
          <Line label="Question orientée « non » (Voss)" text={o.noOriented} copy />
          <Line label="Audit d'accusation (Voss)" text={o.accusationAudit} copy />
          <Line label="Demande de permission" text={s.permission} copy />
        </div>
      </div>
      <div>
        <SectionTitle>Découverte (fais parler, écoute — SPIN)</SectionTitle>
        <ul className="space-y-1.5">
          {s.discovery.map((q, i) => <li key={i} className="text-sm text-zinc-300 flex gap-2"><span className="text-[#c4f82a]">{i + 1}.</span><span>{q}</span></li>)}
        </ul>
      </div>
      <div>
        <SectionTitle>Pitch (court, orienté résultat)</SectionTitle>
        <Line label="Pitch" text={s.pitch} copy />
        <ul className="mt-2 space-y-1">
          {s.bridgeToValue.map((v, i) => <li key={i} className="text-xs text-zinc-400 flex gap-2"><span className="text-emerald-400">→</span><span>{v}</span></li>)}
        </ul>
      </div>
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-3.5">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">Closing — propose un créneau précis</div>
          <CopyButton text={s.close} label="Copier" />
        </div>
        <p className="text-sm text-white leading-relaxed">{s.close}</p>
      </div>
      <Line label="Si messagerie vocale" text={s.voicemail} copy />
    </div>
  )
}

function ObjectionsTab({ data }: { data: CallSheetData }) {
  return (
    <div className="space-y-2.5">
      <SectionTitle>Objections → réponses (cadre LAER : écouter, accuser réception, explorer, répondre)</SectionTitle>
      {data.kit.callScript.objections.map((ob, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
          <div className="text-sm font-bold text-red-300 mb-1.5">{ob.trigger}</div>
          <div className="text-sm text-zinc-200 leading-relaxed border-l-2 border-emerald-500/40 pl-3">{ob.response}</div>
        </div>
      ))}
    </div>
  )
}

function AfterTab({ data, leadId }: { data: CallSheetData; leadId: string }) {
  const [done, setDone] = useState<boolean[]>(data.kit.afterCall.map(() => false))
  return (
    <div className="space-y-5">
      <div>
        <SectionTitle>Checklist après l&apos;appel</SectionTitle>
        <div className="space-y-2">
          {data.kit.afterCall.map((item, i) => (
            <label key={i} className="flex items-start gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] p-3 cursor-pointer">
              <input type="checkbox" checked={done[i]} onChange={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))} className="mt-0.5 accent-emerald-500" />
              <span className={`text-sm ${done[i] ? "text-zinc-500 line-through" : "text-zinc-200"}`}>{item}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={`/admin/ai/acquisition/crm/${leadId}`} className="text-[11px] font-mono px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10">Ouvrir la fiche complète →</a>
        <a href={`/admin/ai/acquisition/crm/${leadId}/audit`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono px-3 py-2 rounded-lg border border-[#c4f82a]/30 bg-[#c4f82a]/10 text-[#c4f82a] hover:bg-[#c4f82a]/18">Envoyer le PDF d&apos;audit</a>
      </div>
    </div>
  )
}
