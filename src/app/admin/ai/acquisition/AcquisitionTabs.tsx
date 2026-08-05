"use client"

import { useState } from "react"
import { DraftComposer } from "./DraftComposer"
import { LeadsExplorer } from "./LeadsExplorer"
import { PipelineKanban } from "./PipelineKanban"
import { KanbanIcon, MailIcon, TableIcon } from "@/components/icons"

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
  { id: "pipeline",  label: "Pipeline",   Icon: KanbanIcon },
  { id: "drafts",    label: "Brouillons", Icon: MailIcon },
  { id: "leads",     label: "Base CRM",   Icon: TableIcon },
]

export function AcquisitionTabs({ pendingDrafts, allLeads }: Props) {
  const [activeTab, setActiveTab] = useState<"pipeline" | "drafts" | "leads">("pipeline")

  const draftsCount = pendingDrafts.length

  return (
    <div className="h-full flex flex-col space-y-3 overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-xl p-1 w-fit shrink-0">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          const Icon = tab.Icon
          const showBadge = tab.id === "drafts" && draftsCount > 0

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
              aria-selected={isActive}
              role="tab"
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-zinc-500"}`} />
              <span>{tab.label}</span>
              {showBadge && (
                <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono leading-none ${
                  isActive ? "bg-white/20 text-white" : "bg-amber-500 text-black"
                }`}>
                  {draftsCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content scrollable container */}
      <div className="flex-1 overflow-y-auto pr-1">
        {/* Pipeline Kanban */}
        {activeTab === "pipeline" && (
          <section className="border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md">
            <div className="mb-3">
              <h2 className="text-sm font-bold text-white">Vue Pipeline Kanban</h2>
              <p className="text-[11px] text-zinc-400">
                Tous les leads par étape — cliquez sur une carte pour voir les détails.
              </p>
            </div>
            <PipelineKanban leads={allLeads} />
          </section>
        )}

        {/* Brouillons */}
        {activeTab === "drafts" && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Brouillons à Valider ({draftsCount})</h2>
                <p className="text-[11px] text-zinc-400">
                  Validez ou modifiez les emails générés par Manon Verhoeven (Creative Copywriter).
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {draftsCount === 0 ? (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                  <MailIcon className="w-6 h-6 mx-auto text-zinc-600 mb-2" />
                  <p className="text-xs text-zinc-400">Aucun brouillon en attente de validation.</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Les nouveaux brouillons apparaissent ici après enrichissement.</p>
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
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Base CRM de Leads</h2>
                <p className="text-[11px] text-zinc-400">Recherche et filtres avancés sur la base qualifiée.</p>
              </div>
            </div>
            <LeadsExplorer initialLeads={allLeads} />
          </section>
        )}
      </div>
    </div>
  )
}
