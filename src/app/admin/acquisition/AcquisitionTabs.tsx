"use client"

import { useState } from "react"
import { DraftComposer } from "./DraftComposer"
import { LeadsExplorer } from "./LeadsExplorer"
import { PipelineKanban } from "./PipelineKanban"

interface AuditData {
  painPoints?: string[]
  recommendedModules?: string[]
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

interface AllLead {
  id: string
  companyName: string
  contactEmail: string | null
  contactName: string | null
  location: string | null
  websiteUrl: string | null
  status: string
  score: number | null
  updatedAt: Date | string
}

interface Props {
  pendingDrafts: Draft[]
  allLeads: AllLead[]
}

const TABS = [
  { id: "pipeline",  label: "Pipeline",   icon: "⬡" },
  { id: "drafts",    label: "Brouillons", icon: "✉" },
  { id: "leads",     label: "Base CRM",   icon: "☰" },
]

export function AcquisitionTabs({ pendingDrafts, allLeads }: Props) {
  const [activeTab, setActiveTab] = useState<"pipeline" | "drafts" | "leads">("pipeline")

  const draftsCount = pendingDrafts.length

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-xl p-1 w-fit">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          const showBadge = tab.id === "drafts" && draftsCount > 0

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
              aria-selected={isActive}
              role="tab"
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
              {showBadge && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono leading-none ${
                  isActive ? "bg-white/20 text-white" : "bg-amber-500 text-black"
                }`}>
                  {draftsCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div>
        {/* Pipeline Kanban */}
        {activeTab === "pipeline" && (
          <section className="border border-white/10 rounded-xl bg-white/[0.01] p-5 backdrop-blur-md">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white">Vue Pipeline</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Tous les leads par étape — cliquez sur une carte pour voir le détail.
              </p>
            </div>
            <PipelineKanban leads={allLeads} />
          </section>
        )}

        {/* Brouillons */}
        {activeTab === "drafts" && (
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white">Brouillons à Valider ({draftsCount})</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Cliquez sur Modifier pour ajuster la formulation ou changer de ton.
              </p>
            </div>
            <div className="space-y-4">
              {draftsCount === 0 ? (
                <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                  <div className="text-3xl mb-3">✉</div>
                  <p className="text-sm text-zinc-400">Aucun brouillon en attente de validation.</p>
                  <p className="text-xs text-zinc-600 mt-1">Les nouveaux brouillons apparaissent ici après enrichissement des leads.</p>
                </div>
              ) : (
                pendingDrafts.map((draft) => (
                  <DraftComposer key={draft.id} draft={draft} />
                ))
              )}
            </div>
          </section>
        )}

        {/* Base CRM */}
        {activeTab === "leads" && (
          <section>
            <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-white">Base de Leads</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Pilotez le pipeline d&apos;acquisition qualifié par nos agents IA.</p>
              </div>
              <a
                href="/api/admin/export/leads"
                download
                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors shrink-0"
              >
                ↓ CSV
              </a>
            </div>
            <LeadsExplorer initialLeads={allLeads} />
          </section>
        )}
      </div>
    </div>
  )
}
