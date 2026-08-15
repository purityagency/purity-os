"use client"

import { useState, useEffect, useTransition } from "react"
import { getCallSheet, logCallOutcome, type CallSheetData, type CallOutcome } from "@/actions/acquisitionActions"
import { CopyButton } from "./CopyButton"
import { scoreBand, scoreTextClass } from "@/lib/acquisition/scoreColor"

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
        className={className ?? "text-[11px] font-mono px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors whitespace-nowrap cursor-pointer"}
      >
        {label}
      </button>
      {open && <Cockpit onClose={() => setOpen(false)} data={data} loading={loading} leadId={leadId} />}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Live Call Cockpit — pensé pour PENDANT l'appel, pas pour être lu avant.
// Un seul écran (fini les 5 onglets à lire) : angle toujours visible, script
// glanceable, objections en accordéon 1-clic, notes + issue d'appel toujours
// accessibles. Le dossier complet (psycho/mécanique/screenshot) est replié —
// utile en prépa, pas pendant le live.
// ─────────────────────────────────────────────────────────────────────────
function Cockpit({ data, loading, onClose, leadId }: { data: CallSheetData | null; loading: boolean; onClose: () => void; leadId: string }) {
  const [elapsed, setElapsed] = useState(0)
  const [notes, setNotes] = useState("")
  const [openObjection, setOpenObjection] = useState<number | null>(null)
  const [showDossier, setShowDossier] = useState(false)
  const [showAltOpeners, setShowAltOpeners] = useState(false)
  const [logged, setLogged] = useState<CallOutcome | null>(null)
  const [pending, startLog] = useTransition()

  // Échap pour fermer + verrou de scroll de l'arrière-plan.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  // Chrono d'appel — démarre dès que la fiche est prête.
  useEffect(() => {
    if (!data) return
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [data])
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0")
  const ss = String(elapsed % 60).padStart(2, "0")

  const scoreColor = scoreTextClass(scoreBand(data?.score ?? null))

  function logOutcome(outcome: CallOutcome) {
    startLog(async () => {
      await logCallOutcome(leadId, outcome, notes)
      setLogged(outcome)
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-5xl h-[88vh] rounded-2xl border border-[#2a2b30] bg-[#1a1b1e] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-[popIn_.16s_cubic-bezier(.16,1,.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes popIn{from{transform:scale(.97);opacity:0}to{transform:scale(1);opacity:1}}`}</style>

        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-[#2a2b30] flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#737884]">Appel en cours</div>
              <h2 className="text-xl font-bold text-[#e8eaed] tracking-tight truncate">{data?.companyName ?? "…"}</h2>
            </div>
            {data && (
              <div className="flex items-center gap-2 text-xs text-[#a3a9b4] shrink-0">
                {data.location && <span className="hidden sm:inline">{data.location}</span>}
                {data.score != null && <span className={`font-mono font-semibold ${scoreColor}`}>{data.score}</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-lg font-bold tabular-nums text-[#e8eaed] bg-[#212226] px-3 py-1.5 rounded-lg border border-[#2a2b30]" aria-label="Durée de l'appel">{mm}:{ss}</span>
            {data?.phone && (
              <a href={`tel:${data.phone.dial}`} className="text-sm font-semibold text-white px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition-colors whitespace-nowrap">Appeler · {data.phone.display}</a>
            )}
            <button type="button" onClick={onClose} aria-label="Fermer" className="w-10 h-10 rounded-xl border border-[#2a2b30] text-[#a3a9b4] hover:bg-[#212226] hover:text-[#e8eaed] grid place-items-center cursor-pointer transition-colors shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>

        {loading || !data ? (
          <div className="flex-1 grid place-items-center text-sm text-[#737884]">Préparation de la fiche…</div>
        ) : (
          <>
            {/* Angle — toujours visible, c'est LE fil rouge de l'appel */}
            <div className="shrink-0 px-6 py-3 border-b border-[#2a2b30] bg-indigo-500/10">
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#818cf8] pt-0.5 shrink-0">{data.kit.angles[0]?.label ?? "Angle"}</span>
                <p className="text-sm text-[#e8eaed] leading-snug">{data.kit.oneLiner}</p>
              </div>
              {data.kit.alternateAngles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {data.kit.alternateAngles.map((a, i) => (
                    <span key={i} title={a.hook} className="text-[10px] font-mono px-2 py-1 rounded-md border border-[#2a2b30] bg-[#161719] text-[#a3a9b4] cursor-help">
                      repli : {a.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Corps live : script à gauche (proactif), réaction à droite */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#2a2b30]">
              <div className="overflow-y-auto custom-scrollbar px-6 py-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <SectionTitle>Ouverture</SectionTitle>
                    <button type="button" onClick={() => setShowAltOpeners((v) => !v)} className="text-[10px] font-mono text-[#818cf8] hover:underline cursor-pointer">
                      {showAltOpeners ? "masquer" : "autres variantes"}
                    </button>
                  </div>
                  <Line label="⭐ Pattern interrupt" text={data.kit.openers.patternInterrupt} copy big />
                  {showAltOpeners && (
                    <div className="mt-2 space-y-2">
                      <Line label="Question orientée « non » (Voss)" text={data.kit.openers.noOriented} copy />
                      <Line label="Audit d'accusation (Voss)" text={data.kit.openers.accusationAudit} copy />
                      <Line label="Demande de permission" text={data.kit.callScript.permission} copy />
                    </div>
                  )}
                </div>

                <div>
                  <SectionTitle>Découverte (SPIN)</SectionTitle>
                  <ul className="space-y-1.5">
                    {data.kit.callScript.discovery.map((q, i) => (
                      <li key={i} className="text-sm text-[#cbd0d8] flex gap-2"><span className="text-[#818cf8] font-mono text-xs shrink-0">{i + 1}.</span><span>{q}</span></li>
                    ))}
                  </ul>
                </div>

                <div>
                  <SectionTitle>Pitch</SectionTitle>
                  <Line label="Pitch court" text={data.kit.callScript.pitch} copy />
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-3.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">Closing</div>
                    <CopyButton text={data.kit.callScript.close} label="Copier" />
                  </div>
                  <p className="text-sm text-[#e8eaed] leading-relaxed">{data.kit.callScript.close}</p>
                </div>

                <Line label="Messagerie vocale" text={data.kit.callScript.voicemail} copy />
              </div>

              <div className="overflow-y-auto custom-scrollbar px-6 py-4 space-y-4">
                <div>
                  <SectionTitle>Objections — tape pour la réponse</SectionTitle>
                  <div className="space-y-1.5">
                    {data.kit.callScript.objections.map((ob, i) => {
                      const isOpen = openObjection === i
                      return (
                        <div key={i} className={`rounded-xl border transition-colors ${isOpen ? "border-emerald-500/40 bg-emerald-500/10" : "border-[#2a2b30] bg-[#212226] hover:border-[#3a3b42]"}`}>
                          <button
                            type="button"
                            onClick={() => setOpenObjection(isOpen ? null : i)}
                            aria-expanded={isOpen}
                            className="w-full text-left px-3.5 py-3 flex items-center justify-between gap-2 cursor-pointer min-h-[44px]"
                          >
                            <span className="text-sm font-bold text-red-300">{ob.trigger}</span>
                            <span className={`text-[#737884] text-xs transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}>▾</span>
                          </button>
                          {isOpen && <div className="px-3.5 pb-3 text-sm text-[#cbd0d8] leading-relaxed border-l-2 border-emerald-300 ml-3.5">{ob.response}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <SectionTitle>Notes</SectionTitle>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ce que tu entends, ce qu'il faut retenir…"
                    rows={4}
                    className="w-full rounded-lg border border-[#2a2b30] bg-[#212226] px-3 py-2.5 text-sm text-[#e8eaed] placeholder:text-[#4b5262] focus:outline-none focus:border-[#6366f1] resize-none transition-colors"
                  />
                </div>

                <div>
                  <button type="button" onClick={() => setShowDossier((v) => !v)} className="text-[11px] font-mono text-[#a3a9b4] hover:text-[#e8eaed] transition-colors cursor-pointer">
                    {showDossier ? "▾ masquer le dossier complet" : "▸ voir le dossier complet"}
                  </button>
                  {showDossier && <DossierExtra data={data} leadId={leadId} />}
                </div>
              </div>
            </div>

            {/* Issue d'appel — toujours visible, capitalise le résultat */}
            <div className="shrink-0 px-6 py-3.5 border-t border-[#2a2b30] bg-[#161719] flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono text-[#737884] mr-1 shrink-0">Issue :</span>
              <OutcomeButton onClick={() => logOutcome("NO_ANSWER")} active={logged === "NO_ANSWER"} pending={pending} tone="neutral">Pas de réponse</OutcomeButton>
              <OutcomeButton onClick={() => logOutcome("NOT_INTERESTED")} active={logged === "NOT_INTERESTED"} pending={pending} tone="red">Pas intéressé</OutcomeButton>
              <OutcomeButton onClick={() => logOutcome("INTERESTED")} active={logged === "INTERESTED"} pending={pending} tone="amber">Intéressé</OutcomeButton>
              <OutcomeButton onClick={() => logOutcome("MEETING")} active={logged === "MEETING"} pending={pending} tone="emerald">🎯 RDV décroché</OutcomeButton>
              {logged && <span className="text-[11px] font-mono text-emerald-400 ml-auto shrink-0">✓ enregistré</span>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10px] font-mono uppercase tracking-wider text-[#737884] mb-2">{children}</h3>
}

function Line({ label, text, copy, big }: { label: string; text: string; copy?: boolean; big?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${big ? "border-[#6366f1]/40 bg-[#6366f1]/10" : "border-[#2a2b30] bg-[#212226]"}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className={`text-[10px] font-mono uppercase tracking-wider ${big ? "text-[#a5b4fc]" : "text-[#737884]"}`}>{label}</div>
        {copy && <CopyButton text={text} label="Copier" />}
      </div>
      <p className={`leading-relaxed whitespace-pre-wrap ${big ? "text-base text-[#f8fafc] font-medium" : "text-sm text-[#cbd0d8]"}`}>{text}</p>
    </div>
  )
}

function OutcomeButton({
  children, onClick, active, pending, tone,
}: {
  children: React.ReactNode; onClick: () => void; active: boolean; pending: boolean
  tone: "neutral" | "red" | "amber" | "emerald"
}) {
  const tones: Record<string, string> = {
    neutral: "border-[#2a2b30] bg-[#212226] text-[#a3a9b4] hover:text-[#e8eaed] hover:bg-[#2a2b30]",
    red: "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20",
    emerald: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 font-bold",
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`text-[12px] font-semibold px-3.5 py-2.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-h-[40px] ${
        active ? "ring-2 ring-offset-1 ring-offset-[#161719] ring-[#6366f1]" : ""
      } ${tones[tone]}`}
    >
      {children}
    </button>
  )
}

function DossierExtra({ data, leadId }: { data: CallSheetData; leadId: string }) {
  const k = data.kit
  const shot = data.websiteUrl ? `https://image.thum.io/get/width/700/crop/900/noanimate/${data.websiteUrl}` : null
  const mechanicsRows: [string, string][] = [
    ["Parole / écoute", k.mechanics.talkListen],
    ["Monologue max", k.mechanics.monologueMax],
    ["Questions", k.mechanics.questionTarget],
    ["Meilleur créneau", k.mechanics.bestWindow],
    ["Persévérance", k.mechanics.persistence],
    ["Ton & rythme", k.mechanics.tone],
  ]
  return (
    <div className="mt-3 space-y-4 border-t border-[#2a2b30] pt-3">
      <div>
        <SectionTitle>Dossier</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {k.dossier.map((r, i) => (
            <div key={i} className="rounded-lg border border-[#2a2b30] bg-[#161719] p-2.5">
              <div className="text-[9px] font-mono uppercase tracking-wider text-[#737884]">{r.label}</div>
              <div className="text-xs text-[#cbd0d8] truncate">{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      {k.findings.length > 0 && (
        <div>
          <SectionTitle>Ce qui le fait perdre des clients</SectionTitle>
          <ul className="space-y-1.5">
            {k.findings.slice(0, 3).map((f, i) => (
              <li key={i} className="text-sm text-[#cbd0d8] flex gap-2"><span className={f.severity === "critique" ? "text-red-400" : "text-amber-400"}>▹</span><span>{f.title}</span></li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <SectionTitle>Mécanique de l&apos;appel</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {mechanicsRows.map(([label, val], i) => (
            <div key={i} className="rounded-lg border border-[#2a2b30] bg-[#161719] p-2.5">
              <div className="text-[9px] font-mono uppercase tracking-wider text-emerald-400/80">{label}</div>
              <div className="text-xs text-[#cbd0d8]">{val}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>Leviers psychologiques</SectionTitle>
        <div className="space-y-2">
          {k.psychology.map((p, i) => (
            <div key={i} className="rounded-lg border border-[#2a2b30] bg-[#161719] p-3">
              <div className="text-xs font-bold text-[#e8eaed]">{p.name}</div>
              <div className="text-[10px] font-mono text-[#818cf8]/80 mb-1">{p.source}</div>
              <div className="text-[11px] text-[#a3a9b4] mb-1"><span className="text-[#737884]">Quand :</span> {p.when}</div>
              <div className="text-xs text-[#cbd0d8] border-l-2 border-emerald-300 pl-2 italic">{p.example}</div>
            </div>
          ))}
        </div>
      </div>

      {shot && (
        <div>
          <SectionTitle>Aperçu du site</SectionTitle>
          <a href={data.websiteUrl!} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-[#2a2b30] bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot} alt="" loading="lazy" className="w-full h-auto block" />
          </a>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <a href={`/admin/ai/acquisition/crm/${leadId}`} className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg border border-[#2a2b30] bg-[#161719] text-[#cbd0d8] hover:text-[#e8eaed] transition-colors">Fiche complète →</a>
        <a href={`/admin/ai/acquisition/crm/${leadId}/audit`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg border border-[#2a2b30] bg-[#161719] text-[#cbd0d8] hover:text-[#e8eaed] transition-colors">📄 PDF audit</a>
        <a href={`/admin/ai/acquisition/crm/${leadId}/deck`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg border border-[#2a2b30] bg-[#161719] text-[#cbd0d8] hover:text-[#e8eaed] transition-colors">🖥️ Deck</a>
        {data.googleMapsUrl && <a href={data.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg border border-[#2a2b30] bg-[#161719] text-[#cbd0d8] hover:text-[#e8eaed] transition-colors">📍 Maps</a>}
      </div>
    </div>
  )
}
