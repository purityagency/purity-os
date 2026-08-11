"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/StatusBadge"
import { sanitizeEmailHtml } from "@/lib/sanitizeHtml"

export interface InboxSentEmail {
  id: string
  subject: string
  bodyHtml: string
  sentAt: string
  openCount: number
  clickCount: number
}

export interface InboxLead {
  id: string
  companyName: string
  contactName: string
  contactEmail: string | null
  missionName: string
  updatedAt: string
  sentEmails: InboxSentEmail[]
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

export function InboxClient({ leads }: { leads: InboxLead[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(leads[0]?.id ?? null)
  const selected = leads.find((l) => l.id === selectedId) ?? null

  if (leads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01] p-10">
          <p className="text-sm font-semibold text-zinc-200">Aucune réponse enregistrée pour l&apos;instant.</p>
          <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
            La détection automatique des réponses n&apos;est pas encore active : les réponses de tes prospects
            arrivent directement dans ta boîte Gmail. Cet onglet se remplira quand le Worker de détection sera déployé.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex gap-4 min-h-0">
      {/* Liste */}
      <div className="w-1/3 min-w-[240px] flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
        {leads.map((lead) => {
          const active = lead.id === selectedId
          return (
            <button
              key={lead.id}
              type="button"
              onClick={() => setSelectedId(lead.id)}
              className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                active ? "bg-[#c4f82a]/10 border-[#c4f82a]/40" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex justify-between items-start mb-1 gap-2">
                <h3 className={`text-sm font-bold truncate ${active ? "text-white" : "text-zinc-200"}`}>{lead.companyName}</h3>
                <span className="text-[10px] text-zinc-500 font-mono shrink-0 mt-0.5">{fmt(lead.updatedAt)}</span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate">{lead.contactName} · {lead.missionName}</p>
              <div className="mt-2"><StatusBadge status="REPLIED" /></div>
            </button>
          )
        })}
      </div>

      {/* Détail */}
      <div className="flex-1 bg-black/30 border border-white/5 rounded-2xl flex flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="shrink-0 p-5 border-b border-white/5 flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white truncate">{selected.companyName}</h2>
                <p className="text-xs text-zinc-400 mt-1 truncate">
                  {selected.contactName}{selected.contactEmail ? ` · ${selected.contactEmail}` : ""}
                </p>
              </div>
              <StatusBadge status="REPLIED" />
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-5 custom-scrollbar">
              {/* Emails RÉELLEMENT envoyés (pas de mock) */}
              {selected.sentEmails.length > 0 ? (
                selected.sentEmails.map((m) => (
                  <div key={m.id} className="flex flex-col gap-1 items-end pl-8">
                    <span className="text-[10px] text-zinc-500 font-mono mr-1">
                      {fmt(m.sentAt)} · Purity
                      {m.openCount > 0 ? ` · ouvert ×${m.openCount}` : ""}
                      {m.clickCount > 0 ? ` · clic ×${m.clickCount}` : ""}
                    </span>
                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl rounded-tr-sm p-4 w-full">
                      <div className="text-xs font-semibold text-white mb-1.5">{m.subject}</div>
                      <div className="text-sm text-zinc-300 prose prose-invert max-w-none prose-p:my-1" dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(m.bodyHtml) }} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 italic text-center py-4">Aucun email sortant enregistré pour ce lead.</p>
              )}

              {/* Réponse entrante : honnête, pas fabriquée */}
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4">
                <p className="text-xs text-cyan-200 font-semibold mb-1">Ce lead a répondu</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Le contenu de sa réponse se trouve dans ta boîte Gmail (la détection auto du contenu n&apos;est pas
                  encore active). Réponds-lui directement depuis Gmail.
                </p>
              </div>
            </div>

            {/* Répondre : vrai mailto (fonctionnel), pas un champ mort */}
            <div className="shrink-0 p-4 border-t border-white/5">
              {selected.contactEmail ? (
                <a
                  href={`mailto:${selected.contactEmail}?subject=${encodeURIComponent("RE: " + (selected.sentEmails[0]?.subject ?? "Votre projet"))}`}
                  className="block text-center w-full py-2.5 rounded-lg bg-[#c4f82a] hover:brightness-95 text-black text-sm font-bold transition"
                >
                  Répondre par email
                </a>
              ) : (
                <p className="text-center text-xs text-zinc-500">Pas d&apos;adresse email connue pour ce lead.</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Sélectionne une conversation</div>
        )}
      </div>
    </div>
  )
}
