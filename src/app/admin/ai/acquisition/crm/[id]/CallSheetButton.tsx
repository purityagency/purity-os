"use client"

import { useState } from "react"
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
  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full bg-[#0a0510] border-l border-white/10 shadow-2xl flex flex-col animate-[slideIn_.2s_ease-out]">
        <style>{`@keyframes slideIn{from{transform:translateX(24px);opacity:.6}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Header */}
        <div className="shrink-0 p-4 border-b border-white/10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">Fiche d&apos;appel</div>
            <h2 className="text-lg font-bold text-white truncate">{data?.companyName ?? "…"}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {data?.phone && (
              <a href={`tel:${data.phone.dial}`} className="text-sm font-mono font-bold text-emerald-300 hover:text-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10">📞 {data.phone.display}</a>
            )}
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white text-lg leading-none cursor-pointer">×</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex gap-1 p-2 border-b border-white/5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {TABS.map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${tab === t ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}>{t}</button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading || !data ? (
            <p className="text-sm text-zinc-500 p-6 text-center">Préparation de la fiche…</p>
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
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.05] p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-violet-300 mb-1">Angle d&apos;accroche</div>
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
              <div className="text-[10px] font-mono text-violet-300/80 mb-1.5">{p.source}</div>
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
          {s.discovery.map((q, i) => <li key={i} className="text-sm text-zinc-300 flex gap-2"><span className="text-violet-400">{i + 1}.</span><span>{q}</span></li>)}
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
        <a href={`/admin/ai/acquisition/crm/${leadId}/audit`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono px-3 py-2 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20">Envoyer le PDF d&apos;audit</a>
      </div>
    </div>
  )
}
