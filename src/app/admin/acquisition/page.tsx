import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { launchMission } from "@/actions/acquisitionActions"
import { DraftActions } from "./DraftActions"

export default async function AdminAcquisitionPage() {
  await requireAdminSession()

  // Fetch recent missions
  const missions = await prisma.mission.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      _count: {
        select: { leads: true }
      }
    }
  })

  // Fetch leads that are ready to be contacted (Drafted)
  const pendingDrafts = await prisma.emailDraft.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: {
      lead: true
    },
    orderBy: { createdAt: "desc" }
  })

  // Leads triés par score décroissant (Lead Scoring Analyst) — les leads
  // jamais scorés (score null) apparaissent en dernier, pas en tête.
  const scoredLeads = await prisma.lead.findMany({
    take: 20,
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Acquisition (Pôle 01)</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Centre de contrôle de l'équipe IA. Gérez vos missions, validez les brouillons du Copywriter, et suivez les leads.
        </p>
      </div>

      {/* MISSIONS SECTION */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Missions Actives</h2>
        </div>

        <details className="mb-4 rounded-2xl border border-white/10 bg-white/5 group">
          <summary className="cursor-pointer list-none p-4 flex items-center justify-between text-sm font-medium text-white">
            <span>+ Nouvelle Mission</span>
            <span className="text-zinc-500 text-xs group-open:hidden">déplier</span>
            <span className="text-zinc-500 text-xs hidden group-open:inline">replier</span>
          </summary>
          <form action={launchMission} className="p-4 pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1" htmlFor="mission-name">Nom de la mission</label>
                <input
                  id="mission-name"
                  name="name"
                  type="text"
                  required
                  placeholder="ex: BTP Wallonie Q3"
                  className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#7C3AED]"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1" htmlFor="mission-quota">Quota de leads (max 50)</label>
                <input
                  id="mission-quota"
                  name="maxLeads"
                  type="number"
                  min={1}
                  max={50}
                  defaultValue={10}
                  required
                  className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C3AED]"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1" htmlFor="mission-sectors">Secteurs (séparés par des virgules)</label>
                <input
                  id="mission-sectors"
                  name="sectors"
                  type="text"
                  required
                  placeholder="ex: Artisan & Bâtiment, Toiture"
                  className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#7C3AED]"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1" htmlFor="mission-locations">Villes (séparées par des virgules)</label>
                <input
                  id="mission-locations"
                  name="locations"
                  type="text"
                  required
                  placeholder="ex: Charleroi, Namur"
                  className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#7C3AED]"
                />
              </div>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] px-4 py-2 text-sm font-medium text-white transition-colors active:scale-[0.98]"
            >
              Lancer la mission
            </button>
          </form>
        </details>

        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {missions.length === 0 ? (
            <p className="p-6 text-sm text-zinc-400">Aucune mission en cours. Lancez le Chief AI.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {missions.map((mission) => (
                <div key={mission.id} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div>
                    <p className="font-semibold text-white">{mission.name}</p>
                    <p className="text-sm text-zinc-400 mt-1">{mission._count.leads} Leads sourcés</p>
                  </div>
                  <div>
                    <span className={`text-[11px] px-2 py-0.5 rounded ${mission.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-zinc-300'}`}>
                      {mission.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* DRAFTS SECTION */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">Brouillons à Valider</h2>
          <p className="text-xs text-zinc-400">Emails générés par le Creative Copywriter, prêts à être envoyés.</p>
        </div>

        <div className="space-y-6">
          {pendingDrafts.length === 0 ? (
            <p className="p-6 text-sm text-zinc-400 bg-white/5 rounded-2xl border border-white/10">
              Aucun brouillon en attente.
            </p>
          ) : (
            pendingDrafts.map((draft) => {
              const auditData = (draft.lead.auditData as any) || {}
              const painPoints = auditData.painPoints || []
              const recommendedModules = auditData.recommendedModules || []

              return (
                <div key={draft.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-xl flex flex-col gap-6">
                  
                  {/* Grid layout for Prospect info (1/3) vs Email preview (2/3) */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left Column: Prospect Details & Audit */}
                    <div className="lg:col-span-1 bg-black/20 border border-white/5 rounded-xl p-5 flex flex-col gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#7C3AED]">Prospect</span>
                        <h3 className="font-semibold text-lg text-white mt-0.5">{draft.lead.companyName}</h3>
                        
                        {/* Score gauge */}
                        {draft.lead.score !== null && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <div className="flex-1 bg-white/10 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  draft.lead.score >= 70 ? 'bg-emerald-500' :
                                  draft.lead.score >= 40 ? 'bg-amber-500' :
                                  'bg-zinc-500'
                                }`}
                                style={{ width: `${draft.lead.score}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-bold text-zinc-300 shrink-0">
                              {draft.lead.score}/100
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Details key-values */}
                      <div className="space-y-2 text-xs border-t border-white/5 pt-4">
                        <div className="flex justify-between gap-2">
                          <span className="text-zinc-500">Source</span>
                          <span className="font-medium text-zinc-300">{draft.lead.source}</span>
                        </div>
                        {draft.lead.location && (
                          <div className="flex justify-between gap-2">
                            <span className="text-zinc-500">Localisation</span>
                            <span className="font-medium text-zinc-300">📍 {draft.lead.location}</span>
                          </div>
                        )}
                        {draft.lead.contactName && (
                          <div className="flex justify-between gap-2">
                            <span className="text-zinc-500">Décideur</span>
                            <span className="font-medium text-zinc-200">
                              {draft.lead.contactName}
                              {draft.lead.contactRole && <span className="text-zinc-500 text-[10px]"> ({draft.lead.contactRole})</span>}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-zinc-500">Adresse Mail</span>
                          {draft.lead.contactEmail ? (
                            <code className="font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-300 text-[11px] break-all">
                              {draft.lead.contactEmail}
                            </code>
                          ) : (
                            <span className="text-amber-400 font-semibold text-[11px]">⚠ Manquante</span>
                          )}
                        </div>
                      </div>

                      {/* Audit Details */}
                      {(painPoints.length > 0 || recommendedModules.length > 0) && (
                        <div className="space-y-3.5 border-t border-white/5 pt-4 text-xs">
                          {painPoints.length > 0 && (
                            <div>
                              <span className="text-zinc-500 block mb-1">Faiblesses détectées</span>
                              <div className="flex flex-wrap gap-1">
                                {painPoints.map((p: string, idx: number) => (
                                  <span key={idx} className="bg-white/5 border border-white/5 text-zinc-300 px-1.5 py-0.5 rounded text-[10px]">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {recommendedModules.length > 0 && (
                            <div>
                              <span className="text-zinc-500 block mb-1">Solutions préconisées</span>
                              <div className="flex flex-wrap gap-1">
                                {recommendedModules.map((m: string, idx: number) => (
                                  <span key={idx} className="bg-[#7C3AED]/15 border border-[#7C3AED]/20 text-violet-300 px-1.5 py-0.5 rounded text-[10px]">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* External links */}
                      <div className="flex gap-4 border-t border-white/5 pt-4 text-xs mt-auto">
                        {draft.lead.websiteUrl && (
                          <a
                            href={draft.lead.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-400 hover:text-violet-300 underline font-medium"
                          >
                            Visiter le Site ↗
                          </a>
                        )}
                        {draft.lead.googleMapsUrl && (
                          <a
                            href={draft.lead.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-zinc-300 underline font-medium"
                          >
                            Google Maps ↗
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Email Client Composer */}
                    <div className="lg:col-span-2 flex flex-col border border-white/10 rounded-xl bg-black/40 overflow-hidden shadow-2xl">
                      
                      {/* Email Header */}
                      <div className="p-4 bg-white/[0.02] border-b border-white/10 space-y-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 w-12">De :</span>
                          <span className="text-zinc-300">
                            <strong>Manon Verhoeven</strong> &lt;manon@purity-agency.be&gt;
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 w-12">À :</span>
                          <span className="text-zinc-300">
                            {draft.lead.contactName ? `${draft.lead.contactName} ` : ""}
                            {draft.lead.contactEmail ? (
                              <code className="text-emerald-400 bg-emerald-500/5 px-1 rounded font-mono">&lt;{draft.lead.contactEmail}&gt;</code>
                            ) : (
                              <span className="text-amber-400 font-semibold">&lt;adresse manquante&gt;</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 pt-1 border-t border-white/5">
                          <span className="text-zinc-500 w-12 shrink-0 mt-0.5">Objet :</span>
                          <span className="text-white font-medium">{draft.subject}</span>
                        </div>
                      </div>

                      {/* Email Body preview */}
                      <div className="p-6 bg-[#060309]/30 overflow-y-auto max-h-[350px] min-h-[220px] text-zinc-200 font-sans text-sm leading-relaxed border-b border-white/10">
                        <div 
                          className="prose prose-invert max-w-none prose-sm font-sans"
                          dangerouslySetInnerHTML={{ __html: draft.bodyHtml }} 
                        />
                      </div>

                      {/* Email Actions footer */}
                      <div className="px-5 py-3 bg-white/[0.01] flex justify-between items-center gap-4 flex-wrap">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                          Mode de rendu: HTML
                        </div>
                        <DraftActions draftId={draft.id} hasContactEmail={!!draft.lead.contactEmail} />
                      </div>

                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* LEADS SECTION */}
      <section>
        <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-white">Leads (par score)</h2>
            <p className="text-xs text-zinc-400">
              Score calculé par le Lead Scoring Analyst — contact vérifié, opportunité technique,
              avancement pipeline. Un score vide n&apos;est pas un mauvais lead, juste pas encore scoré.
            </p>
          </div>
          <a
            href="/api/admin/export/leads"
            download
            className="rounded-lg border border-white/10 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 transition-colors shrink-0"
          >
            Exporter CSV
          </a>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {scoredLeads.length === 0 ? (
            <p className="p-6 text-sm text-zinc-400">Aucun lead pour l&apos;instant.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {scoredLeads.map((lead) => (
                <div key={lead.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{lead.companyName}</p>
                    <p className="text-xs text-zinc-400 truncate">
                      {lead.contactEmail ?? "Pas de contact"} · {lead.location ?? "?"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-white/10 text-zinc-300">{lead.status}</span>
                    <span
                      className={`text-sm font-bold tabular-nums w-10 text-right ${
                        lead.score == null
                          ? "text-zinc-600"
                          : lead.score >= 70
                          ? "text-emerald-400"
                          : lead.score >= 40
                          ? "text-amber-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {lead.score ?? "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
