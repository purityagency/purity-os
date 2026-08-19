"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { launchMission } from "@/actions/acquisitionActions"

export function AcquisitionHeaderActions({ missions }: { missions: any[] }) {
  const [isMissionFormOpen, setIsMissionFormOpen] = useState(false)
  const [isMissionsPanelOpen, setIsMissionsPanelOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successAnim, setSuccessAnim] = useState(false)

  const activeMissions = missions.filter(m => m.status === "ACTIVE")

  async function handleLaunch(formData: FormData) {
    setIsSubmitting(true)
    try {
      await launchMission(formData)
      setSuccessAnim(true)
      setTimeout(() => {
        setSuccessAnim(false)
        setIsMissionFormOpen(false)
      }, 1500)
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 relative">
        <button
          onClick={() => setIsMissionsPanelOpen(true)}
          className="text-[13px] font-medium text-[#f8fafc] px-4 py-2 bg-[#0f1014] border border-white/5 rounded-lg hover:bg-[#1a1b1f] transition-colors shadow-sm"
        >
          {activeMissions.length} Missions en cours
        </button>

        <button
          onClick={() => setIsMissionFormOpen(!isMissionFormOpen)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#7c3aed] text-white text-[13px] font-medium px-4 py-2 hover:bg-[#6d28d9] transition-colors shadow-sm"
        >
          + Déployer
        </button>

        <AnimatePresence mode="wait">
          {isMissionFormOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-12 z-40 w-80 p-5 rounded-xl border border-white/10 bg-[#0f1014] shadow-2xl overflow-hidden"
            >
              <div className="text-[13px] font-semibold text-[#f8fafc] border-b border-white/5 pb-3 mb-4">Nouvelle mission</div>
              
              <AnimatePresence mode="wait">
                {successAnim ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-6 gap-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#10b981]/20 flex items-center justify-center">
                      <span className="text-[#10b981] text-xl font-bold">✓</span>
                    </div>
                    <div className="text-[13px] font-medium text-[#10b981]">Mission déployée</div>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    action={handleLaunch}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3.5 relative"
                  >
                    {[
                      { id: "name", label: "Nom de code", ph: "ex : Coiffeurs Namur" },
                      { id: "sectors", label: "Secteur(s)", ph: "ex : Coiffure" },
                      { id: "locations", label: "Zone(s)", ph: "ex : Namur" },
                    ].map((f) => (
                      <div key={f.id}>
                        <label className="block text-[11px] font-medium text-[#94a3b8] mb-1.5" htmlFor={`m-${f.id}`}>{f.label}</label>
                        <input id={`m-${f.id}`} name={f.id} type="text" required placeholder={f.ph} className="w-full rounded-lg bg-[#1a1b1f] border border-white/5 px-3 py-2 text-[13px] text-[#f8fafc] placeholder:text-[#64748b] focus:outline-none focus:border-[#7c3aed] transition-colors" />
                      </div>
                    ))}
                    <div>
                      <label className="block text-[11px] font-medium text-[#94a3b8] mb-1.5" htmlFor="m-quota">Quota Cible (1-50)</label>
                      <input id="m-quota" name="maxLeads" type="number" min={1} max={50} defaultValue={15} required className="w-full rounded-lg bg-[#1a1b1f] border border-white/5 px-3 py-2 text-[13px] text-[#f8fafc] focus:outline-none focus:border-[#7c3aed] transition-colors" />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full mt-2 py-2.5 rounded-lg bg-[#f8fafc] text-[#060309] text-[13px] font-semibold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-[#060309] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "Lancer l'opération"
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Slide-over Missions */}
      <AnimatePresence>
        {isMissionsPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMissionsPanelOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#060309] border-l border-white/5 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div>
                  <h2 className="text-lg font-semibold text-[#f8fafc] tracking-tight">Missions Actives</h2>
                  <p className="text-[12px] font-medium text-[#94a3b8] mt-1">{activeMissions.length} opérations en cours</p>
                </div>
                <button
                  onClick={() => setIsMissionsPanelOpen(false)}
                  className="p-2 text-[#94a3b8] hover:text-[#f8fafc] transition-colors rounded-lg hover:bg-white/5"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {missions.map(m => {
                  const params = (m.parameters as { sectors?: string[]; locations?: string[]; maxLeads?: number } | null) ?? {}
                  const sectors = Array.isArray(params.sectors) ? params.sectors : []
                  const locations = Array.isArray(params.locations) ? params.locations : []
                  const maxLeads = params.maxLeads ?? 50
                  const leadsCount = m._count?.leads || 0
                  return (
                    <div key={m.id} className="p-4 rounded-xl border border-white/5 bg-[#0f1014]">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-[14px] font-semibold text-[#f8fafc]">{m.name}</div>
                          <div className="text-[11px] font-medium text-[#64748b] mt-1">
                            {sectors.length > 0 ? sectors.join(", ") : "—"}
                            {locations.length > 0 ? ` · ${locations.join(", ")}` : ""}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider ${m.status === 'ACTIVE' ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-white/5 text-[#94a3b8]'}`}>
                          {m.status}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-medium text-[#94a3b8]">
                          <span>Progression</span>
                          <span>{leadsCount} / {maxLeads} Leads</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#1a1b1f] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${m.status === 'ACTIVE' ? 'bg-[#7c3aed]' : 'bg-[#64748b]'}`}
                            style={{ width: `${Math.min(100, Math.max(2, (leadsCount / maxLeads) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
                
                {missions.length === 0 && (
                  <div className="text-center py-10 text-[#64748b] text-[13px]">
                    Aucune mission n'a été déployée.
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
