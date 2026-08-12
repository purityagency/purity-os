"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { generateInstagramPlan, updateDraftStatus } from "@/actions/socialActions"

export interface DraftView {
  id: string
  format: string
  postText: string
  status: string
  structured: Record<string, unknown> | null
  createdAt: string
}

const PILLARS = [
  { key: "", label: "Auto (répartition)" },
  { key: "CAS_ROI", label: "Cas & ROI" },
  { key: "AUTORITE_TECH", label: "Autorité tech" },
  { key: "ESTHETIQUE", label: "Esthétique" },
  { key: "COULISSES", label: "Coulisses" },
]

const PILLAR_LABEL: Record<string, string> = {
  CAS_ROI: "Cas & ROI", AUTORITE_TECH: "Autorité", ESTHETIQUE: "Esthétique", COULISSES: "Coulisses",
}
const FORMAT_TONE: Record<string, string> = {
  REEL: "bg-[#7c3aed]/15 text-[#c4b5fd] border-[#7c3aed]/30",
  CARROUSEL: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  POST: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
}

export function SocialClient({ initialDrafts }: { initialDrafts: DraftView[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [count, setCount] = useState(5)
  const [pillar, setPillar] = useState("")
  const [offer, setOffer] = useState("site premium + SEO local pour commerces & TPE belges")
  const [error, setError] = useState<string | null>(null)

  function generate() {
    setError(null)
    start(async () => {
      try {
        await generateInstagramPlan({
          count,
          pillarFocus: (pillar || undefined) as never,
          offerFocus: offer || undefined,
        })
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de génération")
      }
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-white/5">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#7c3aed]">Pôle Visibilité · Instagram</div>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Studio de contenu Instagram</h1>
          <p className="text-[14px] text-[#94a3b8] mt-1">Jade Willems génère du contenu prêt-à-poster, calé sur ta stratégie et ta voix de marque.</p>
        </div>
        <span className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#7c3aed]/30 bg-[#7c3aed]/15 text-[#c4b5fd] tabular-nums self-start">
          {initialDrafts.length} contenus
        </span>
      </div>

      {/* Générateur */}
      <div className="rounded-2xl border border-white/5 bg-[#0f1014] p-5">
        <div className="grid grid-cols-1 md:grid-cols-[6rem_12rem_1fr_auto] gap-3 items-end">
          <label className="block">
            <span className="block text-[11px] font-medium text-[#94a3b8] mb-1">Nombre</span>
            <input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
              className="w-full rounded-lg bg-[#060309] border border-white/10 px-3 py-2 text-sm text-[#f8fafc] focus:outline-none focus:border-[#7c3aed]" />
          </label>
          <label className="block">
            <span className="block text-[11px] font-medium text-[#94a3b8] mb-1">Pilier</span>
            <select value={pillar} onChange={(e) => setPillar(e.target.value)}
              className="w-full rounded-lg bg-[#060309] border border-white/10 px-3 py-2 text-sm text-[#f8fafc] focus:outline-none focus:border-[#7c3aed] cursor-pointer">
              {PILLARS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-[11px] font-medium text-[#94a3b8] mb-1">Offre / angle à mettre en avant</span>
            <input type="text" value={offer} onChange={(e) => setOffer(e.target.value)}
              className="w-full rounded-lg bg-[#060309] border border-white/10 px-3 py-2 text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:outline-none focus:border-[#7c3aed]" />
          </label>
          <button onClick={generate} disabled={pending}
            className="rounded-lg px-5 py-2 text-sm font-semibold text-white bg-[#7c3aed] hover:bg-[#6d28d9] transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
            {pending ? "Génération…" : "Générer ✦"}
          </button>
        </div>
        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
        {pending && <p className="text-xs text-[#94a3b8] mt-3">Jade réfléchit… (~15-30s selon le nombre)</p>}
      </div>

      {/* Grille de contenus */}
      {initialDrafts.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl bg-[#0f1014]">
          <p className="text-sm font-semibold text-[#cbd5e1]">Aucun contenu encore.</p>
          <p className="text-xs text-[#64748b] mt-1">Lance une génération ci-dessus pour créer tes premiers posts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {initialDrafts.map((d) => <ContentCard key={d.id} d={d} onStatus={(s) => start(async () => { await updateDraftStatus(d.id, s); router.refresh() })} />)}
        </div>
      )}
    </div>
  )
}

function ContentCard({ d, onStatus }: { d: DraftView; onStatus: (s: string) => void }) {
  const s = d.structured ?? {}
  const hook = String(s.hook ?? "")
  const pillar = String(s.pillar ?? "")
  const hashtags = Array.isArray(s.hashtags) ? (s.hashtags as string[]) : []
  const cta = String(s.cta ?? "")
  const visualBrief = String(s.visualBrief ?? "")
  const reelScript = s.reelScript ? String(s.reelScript) : null
  const slides = Array.isArray(s.carouselSlides) ? (s.carouselSlides as string[]) : null
  const caption = String(s.caption ?? d.postText)
  const humanScore = typeof s.humanScore === "number" ? (s.humanScore as number) : null
  const [copied, setCopied] = useState(false)

  const approved = d.status === "APPROVED" || d.status === "PUBLISHED"
  const rejected = d.status === "REJECTED"

  function copyAll() {
    navigator.clipboard.writeText(d.postText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }

  return (
    <div className={`rounded-2xl border bg-[#0f1014] overflow-hidden flex flex-col ${rejected ? "border-white/5 opacity-50" : "border-white/5"}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-11 bg-[#09090c] border-b border-white/5">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${FORMAT_TONE[d.format] ?? "bg-white/5 text-[#94a3b8] border-white/10"}`}>{d.format}</span>
        {pillar && <span className="text-[11px] font-medium text-[#94a3b8]">{PILLAR_LABEL[pillar] ?? pillar}</span>}
        {humanScore != null && <span className="ml-auto text-[11px] font-mono text-[#7c3aed]">{humanScore}/10</span>}
      </div>

      <div className="p-4 space-y-3 flex-1">
        {hook && <p className="text-[15px] font-semibold text-[#f8fafc] leading-snug">{hook}</p>}
        <p className="text-[13px] text-[#cbd5e1] whitespace-pre-wrap leading-relaxed">{caption}</p>

        {slides && (
          <div className="rounded-lg border border-white/5 bg-[#060309] p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#64748b] mb-1.5">Slides carrousel</div>
            <ol className="space-y-1 text-[12px] text-[#94a3b8]">
              {slides.map((sl, i) => <li key={i}><span className="text-[#7c3aed] font-mono mr-1">{i + 1}.</span>{sl}</li>)}
            </ol>
          </div>
        )}
        {reelScript && (
          <div className="rounded-lg border border-white/5 bg-[#060309] p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#64748b] mb-1.5">Script reel</div>
            <p className="text-[12px] text-[#94a3b8] whitespace-pre-wrap leading-relaxed">{reelScript}</p>
          </div>
        )}
        {visualBrief && (
          <div className="rounded-lg border border-white/5 bg-[#060309] p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#64748b] mb-1.5">Brief visuel</div>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">{visualBrief}</p>
          </div>
        )}
        {cta && <p className="text-[13px] font-semibold text-[#c4b5fd]">➜ {cta}</p>}
        {hashtags.length > 0 && (
          <p className="text-[12px] text-[#64748b] leading-relaxed">{hashtags.map((h) => "#" + h).join(" ")}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 h-12 border-t border-white/5 overflow-x-auto custom-scrollbar whitespace-nowrap">
        <button onClick={copyAll} className="text-[12px] font-medium px-3 py-1.5 rounded-md border border-white/10 text-[#cbd5e1] hover:bg-white/5 transition-colors">
          {copied ? "Copié ✓" : "Copier le post"}
        </button>
        <a 
          href={`/api/social/render?draftId=${d.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-medium px-3 py-1.5 rounded-md bg-[#7c3aed]/15 text-[#c4b5fd] border border-[#7c3aed]/30 hover:bg-[#7c3aed]/25 transition-colors flex items-center gap-1.5"
        >
          <span>Générer Visuel</span>
          <span className="text-[10px]">↗</span>
        </a>
        <div className="ml-auto flex items-center gap-2 pl-4">
          {!approved && (
            <button onClick={() => onStatus("APPROVED")} className="text-[12px] font-semibold px-3 py-1.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors">Valider</button>
          )}
          {approved && <span className="text-[12px] font-semibold text-emerald-300">✓ Validé</span>}
          {!rejected && !approved && (
            <button onClick={() => onStatus("REJECTED")} className="text-[12px] font-medium px-3 py-1.5 rounded-md border border-white/10 text-[#94a3b8] hover:bg-white/5 transition-colors">Rejeter</button>
          )}
        </div>
      </div>
    </div>
  )
}
