"use client"

import { useState, useTransition } from "react"
import { approveAndSendDraft, rejectDraft, updateDraftAction, regenerateDraftAction } from "@/actions/acquisitionActions"
import { sanitizeEmailHtml } from "@/lib/sanitizeHtml"

interface AuditData {
  painPoints?: string[]
  recommendedModules?: string[]
  linkedinDraft?: { message: string; signalUsed: string }
  adsBrief?: { headline: string; primaryText: string; targetingNotes: string }
  [key: string]: unknown
}

interface Lead {
  id: string
  companyName: string
  websiteUrl: string | null
  contactName: string | null
  contactEmail: string | null
  contactRole: string | null
  location: string | null
  score: number | null
  auditData: AuditData | null | undefined
}

interface Draft {
  id: string
  subject: string
  bodyHtml: string
  tone: string | null
  lead: Lead
}

export function DraftComposer({ draft }: { draft: Draft }) {
  const [isEditing, setIsEditing] = useState(false)
  const [subject, setSubject] = useState(draft.subject)
  const [bodyHtml, setBodyHtml] = useState(draft.bodyHtml)
  const [tone, setTone] = useState(draft.tone || "Liquid Glass (Premium)")
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const [isPending, startTransition] = useTransition()
  const [isSaving, startSaveTransition] = useTransition()
  const [isSending, startSendTransition] = useTransition()
  const [isRejecting, startRejectTransition] = useTransition()

  const handleSave = () => {
    setMessage(null)
    startSaveTransition(async () => {
      const res = await updateDraftAction(draft.id, subject, bodyHtml)
      if (res.ok) {
        setIsEditing(false)
        setMessage({ ok: true, text: "✓ Brouillon sauvegardé avec succès." })
      } else {
        setMessage({ ok: false, text: `✕ ${res.message}` })
      }
    })
  }

  const handleRegenerate = () => {
    setMessage(null)
    startTransition(async () => {
      const res = await regenerateDraftAction(draft.id, tone)
      if (res.ok) {
        setMessage({ ok: true, text: "✓ Brouillon régénéré avec succès." })
        setIsEditing(false)
      } else {
        setMessage({ ok: false, text: `✕ ${res.message}` })
      }
    })
  }

  const handleSend = () => {
    setMessage(null)
    startSendTransition(async () => {
      const res = await approveAndSendDraft(draft.id, null)
      if (res.ok) {
        setMessage({ ok: true, text: "✓ E-mail envoyé avec succès !" })
      } else {
        setMessage({ ok: false, text: `✕ ${res.message}` })
      }
    })
  }

  const handleReject = () => {
    setMessage(null)
    startRejectTransition(async () => {
      const res = await rejectDraft(draft.id, null)
      if (res.ok) {
        setMessage({ ok: true, text: "✓ Brouillon rejeté et archivé." })
      } else {
        setMessage({ ok: false, text: `✕ ${res.message}` })
      }
    })
  }

  const painPoints = draft.lead.auditData?.painPoints || []
  const recommendedModules = draft.lead.auditData?.recommendedModules || []
  const hasContactEmail = !!draft.lead.contactEmail

  return (
    <div className="relative border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden transition-colors hover:border-white/20 mb-6">
      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
        
        {/* Colonne Gauche : Détails du Prospect (1/3) */}
        <div className="p-5 lg:p-6 bg-black/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-mono">Fiche Prospect</span>
            <div className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#c4f82a]/10 text-[#c4f82a] border border-[#c4f82a]/25">
              Score: {draft.lead.score || "N/A"}
            </div>
          </div>

          <h3 className="text-base font-bold text-white mb-1">{draft.lead.companyName}</h3>
          
          {draft.lead.websiteUrl && (
            <a 
              href={draft.lead.websiteUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs text-[#c4f82a] hover:underline inline-flex items-center gap-1 mb-4"
            >
              🌐 {draft.lead.websiteUrl.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          )}

          <div className="space-y-3.5 text-xs text-white/70 border-t border-white/5 pt-4">
            <div>
              <span className="text-white/40 block mb-0.5">Contact</span>
              <span className="font-medium text-white">{draft.lead.contactName || "Inconnu"}</span>
              {draft.lead.contactRole && <span className="text-white/40 font-mono text-[10px] ml-1.5">({draft.lead.contactRole})</span>}
            </div>

            <div>
              <span className="text-white/40 block mb-0.5">E-mail de destination</span>
              <span className="font-mono text-white/90 break-all">{draft.lead.contactEmail || "Aucun e-mail trouvé"}</span>
            </div>

            {draft.lead.location && (
              <div>
                <span className="text-white/40 block mb-0.5">Localisation</span>
                <span className="text-white/90">📍 {draft.lead.location}</span>
              </div>
            )}

            {painPoints.length > 0 && (
              <div>
                <span className="text-white/40 block mb-1">Faiblesses détectées</span>
                <div className="flex flex-wrap gap-1">
                  {painPoints.map((p: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-red-500/5 border border-red-500/10 text-red-400 text-[10px]">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {recommendedModules.length > 0 && (
              <div>
                <span className="text-white/40 block mb-1">Modules recommandés</span>
                <div className="flex flex-wrap gap-1">
                  {recommendedModules.map((m: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-[#c4f82a]/10 border border-[#c4f82a]/20 text-[#c4f82a] text-[10px]">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Colonne Droite : Console Mail (2/3) */}
        <div className="lg:col-span-2 p-5 lg:p-6 flex flex-col justify-between">
          <div>
            {/* Barre de contrôle du Tone et de l'état */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-bottom border-white/5">
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-mono">Brouillon IA</span>
              
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/60">Ton :</span>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  disabled={isPending || isSaving || isSending || isRejecting}
                  className="bg-black/40 border border-white/10 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#c4f82a] transition-all cursor-pointer"
                >
                  <option value="Liquid Glass (Premium)">Premium sobre</option>
                  <option value="Direct & Cash">Direct & cash</option>
                  <option value="Subtil & Conseil">Subtil & conseil</option>
                  <option value="Cyber-Futuriste">Moderne & tech</option>
                </select>

                <button
                  onClick={handleRegenerate}
                  disabled={isPending || isSaving || isSending || isRejecting}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1.5"
                >
                  {isPending ? (
                    <>
                      <span className="w-2.5 h-2.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Régénération...</span>
                    </>
                  ) : (
                    <span>🔄 Régénérer</span>
                  )}
                </button>
              </div>
            </div>

            {/* Sujet et Corps du Mail */}
            <div className="space-y-4">
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-mono text-white/40 block mb-1">Sujet</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c4f82a] transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-mono text-white/40 block mb-1">Corps (HTML)</label>
                    <textarea
                      value={bodyHtml}
                      onChange={(e) => setBodyHtml(e.target.value)}
                      rows={8}
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#c4f82a] transition-all resize-y"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-black/20 border border-white/5 p-4 space-y-3">
                  <div>
                    <span className="text-white/40 text-[10px] font-mono block">Objet :</span>
                    <span className="text-xs font-semibold text-white">{subject}</span>
                  </div>
                  <div className="border-t border-white/5 pt-3">
                    <span className="text-white/40 text-[10px] font-mono block mb-1.5">Corps du message :</span>
                    <div 
                      className="text-xs text-white/80 space-y-2 prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(bodyHtml) }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Simulated Drafts (LinkedIn & Ads) */}
            {(draft.lead.auditData?.linkedinDraft || draft.lead.auditData?.adsBrief) && (
              <div className="mt-6 pt-4 border-t border-white/5 space-y-4">
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-mono block">Autres canaux (LinkedIn / Ads)</span>
                
                {draft.lead.auditData.linkedinDraft && (
                  <div className="rounded-lg bg-[#0A66C2]/10 border border-[#0A66C2]/20 p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono text-[#0A66C2] bg-[#0A66C2]/20 px-2 py-0.5 rounded">LinkedIn</span>
                      <span className="text-[10px] text-white/40">Signal: {draft.lead.auditData.linkedinDraft.signalUsed}</span>
                    </div>
                    <p className="text-xs text-white/80 font-mono whitespace-pre-wrap">{draft.lead.auditData.linkedinDraft.message}</p>
                  </div>
                )}

                {draft.lead.auditData.adsBrief && (
                  <div className="rounded-lg bg-pink-500/10 border border-pink-500/20 p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono text-pink-400 bg-pink-500/20 px-2 py-0.5 rounded">Ads Brief</span>
                      <span className="text-[10px] text-white/40">Ciblage: {draft.lead.auditData.adsBrief.targetingNotes}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white mb-1">{draft.lead.auditData.adsBrief.headline}</p>
                      <p className="text-xs text-white/80">{draft.lead.auditData.adsBrief.primaryText}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Boutons d'Action (Modifier, Sauvegarder, Annuler, Rejeter, Envoyer) */}
          <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
            <div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                  >
                    {isSaving ? "Sauvegarde..." : "Sauvegarder"}
                  </button>
                  <button
                    onClick={() => {
                      setSubject(draft.subject)
                      setBodyHtml(draft.bodyHtml)
                      setIsEditing(false)
                    }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={isPending || isSaving || isSending || isRejecting}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
                >
                  📝 Modifier
                </button>
              )}
            </div>

            {/* Actions de décision final */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleReject}
                disabled={isPending || isSaving || isSending || isRejecting}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5 text-red-400 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {isRejecting ? "Rejet..." : "Rejeter"}
              </button>

              <button
                onClick={handleSend}
                disabled={!hasContactEmail || isPending || isSaving || isSending || isRejecting}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#c4f82a] hover:brightness-95 text-black transition flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {isSending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Envoi...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                    <span>Valider & Envoyer</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Messages de retour */}
          {message && (
            <div className="mt-3">
              <p className={`text-xs font-medium ${message.ok ? "text-emerald-400" : "text-red-400"}`}>
                {message.text}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
