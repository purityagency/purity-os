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

        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {pendingDrafts.length === 0 ? (
            <p className="p-6 text-sm text-zinc-400">Aucun brouillon en attente.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {pendingDrafts.map((draft) => (
                <div key={draft.id} className="p-5 flex flex-col gap-3 hover:bg-white/5 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{draft.lead.companyName}</p>
                      <p className="text-sm text-zinc-300 mt-1">Sujet : {draft.subject}</p>
                      {!draft.lead.contactEmail && (
                        <p className="text-xs text-amber-400 mt-1">Aucun e-mail de contact — envoi impossible</p>
                      )}
                    </div>
                    <DraftActions draftId={draft.id} hasContactEmail={!!draft.lead.contactEmail} />
                  </div>
                  <div className="p-3 rounded-lg border border-white/10 bg-black/20 text-sm text-zinc-300 prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: draft.bodyHtml}} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* LEADS SECTION */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">Leads (par score)</h2>
          <p className="text-xs text-zinc-400">
            Score calculé par le Lead Scoring Analyst — contact vérifié, opportunité technique,
            avancement pipeline. Un score vide n&apos;est pas un mauvais lead, juste pas encore scoré.
          </p>
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
