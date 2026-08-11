import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { notFound } from "next/navigation"
import Link from "next/link"
import { CopyButton } from "./CopyButton"
import { GenerateAnglesButton } from "./GenerateAnglesButton"
import { EnrichButton } from "./EnrichButton"
import { CallSheetButton } from "./CallSheetButton"
import { GlobeIcon, LocationIcon, UserIcon, MailIcon } from "@/components/icons"
import { StatusBadge } from "@/components/StatusBadge"
import type { PageSpeedReport, PageSpeedMetric } from "@/lib/acquisition/pageSpeedInsights"

export const dynamic = "force-dynamic"

interface AuditData {
  performanceScore?: number | null
  seoScore?: number | null
  techOpportunity?: number | null
  contactPhone?: string | null
  painPoints?: string[]
  recommendedModules?: string[]
  lastAuditAt?: string
  pageSpeed?: PageSpeedReport
  seoAudit?: unknown
  linkedinDraft?: unknown
  adsBrief?: unknown
  [k: string]: unknown
}

function scoreColor(s: number) {
  return s >= 70 ? "text-emerald-400" : s >= 40 ? "text-amber-400" : "text-red-400"
}

// Rend une valeur inconnue (sortie d'agent) de façon lisible : chaîne brute,
// liste, ou objet en lignes libellées — jamais un dump JSON illisible.
function readableEntries(value: unknown): { label: string; text: string }[] {
  if (!value) return []
  if (typeof value === "string") return value.trim() ? [{ label: "", text: value }] : []
  if (Array.isArray(value)) return value.map((v, i) => ({ label: `${i + 1}`, text: String(v) }))
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => ({
        label: k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
        text: Array.isArray(v) ? v.join(", ") : String(v),
      }))
  }
  return [{ label: "", text: String(value) }]
}

function plainText(value: unknown): string {
  return readableEntries(value).map((e) => (e.label ? `${e.label}: ${e.text}` : e.text)).join("\n")
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession()
  const { id } = await params

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      mission: { select: { name: true } },
      emailDrafts: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!lead) notFound()

  const audit = (lead.auditData as AuditData | null) ?? {}
  const phone = audit.contactPhone ?? null
  const score = lead.score ?? null
  const mapsQuery = encodeURIComponent(`${lead.companyName} ${lead.location ?? "Belgique"}`)
  const mapsEmbed = `https://maps.google.com/maps?q=${mapsQuery}&z=15&output=embed`
  const mapsLink = lead.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`
  const shot = lead.websiteUrl
    ? `https://image.thum.io/get/width/900/crop/1100/noanimate/${lead.websiteUrl}`
    : null

  const perf = audit.performanceScore
  const seo = audit.seoScore
  const techOpp = audit.techOpportunity

  return (
    <div className="h-full overflow-y-auto bg-[#212226] p-4 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Retour */}
        <Link href="/admin/ai/acquisition/crm" className="inline-flex items-center gap-1.5 text-xs font-mono text-[#a3a9b4] hover:text-[#6366f1] transition-colors">
          ← Retour au CRM
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#2a2b30] pb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 text-[10px] font-mono uppercase tracking-wider text-[#737884]">
              <span>Fiche prospection</span>
              <span className="text-[#737884]">·</span>
              <span>Source {lead.source}</span>
              {audit.lastAuditAt && <><span className="text-[#737884]">·</span><span>Audité le {new Date(audit.lastAuditAt).toLocaleDateString("fr-BE")}</span></>}
            </div>
            <h1 className="text-2xl font-bold text-[#e8eaed] tracking-tight truncate">{lead.companyName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <StatusBadge status={lead.status} />
              {lead.mission?.name && <span className="text-[11px] font-mono text-[#737884]">Mission : {lead.mission.name}</span>}
              {lead.optedOut && <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/30">Désinscrit</span>}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <div className="flex flex-col gap-1.5">
              <a href={`/admin/ai/acquisition/crm/${lead.id}/audit`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/15 text-[#6366f1] hover:bg-indigo-500/25 transition-colors whitespace-nowrap text-center">
                📄 PDF d&apos;audit
              </a>
              <a href={`/admin/ai/acquisition/crm/${lead.id}/deck`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono px-3 py-1.5 rounded-lg border border-[#2a2b30] bg-[#212226] text-[#cbd0d8] hover:bg-[#e8eaef] transition-colors whitespace-nowrap text-center">
                🖥️ Deck présentation
              </a>
              <CallSheetButton leadId={lead.id} label={`📞 Fiche d'appel${phone ? "" : " (pas de n°)"}`} className={`text-[11px] font-mono px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap text-center cursor-pointer ${phone ? "border-emerald-300 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25" : "border-[#2a2b30] bg-[#212226] text-[#cbd0d8] hover:bg-[#e8eaef]"}`} />
            </div>
            {score !== null && (
              <div className="text-right">
                <div className={`text-4xl font-bold tabular-nums ${scoreColor(score)}`}>{score}<span className="text-lg text-[#737884]">/100</span></div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#737884]">Score qualité</div>
              </div>
            )}
          </div>
        </div>

        {/* Actions rapides / liens */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <a href={lead.websiteUrl || "#"} target="_blank" rel="noopener noreferrer"
             className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${lead.websiteUrl ? "border-[#2a2b30] bg-[#212226] hover:border-indigo-300 hover:bg-[#212226]" : "border-[#2a2b30] bg-[#212226] opacity-40 pointer-events-none"}`}>
            <GlobeIcon className="w-4 h-4 text-[#6366f1] shrink-0" />
            <div className="min-w-0"><div className="text-[10px] font-mono uppercase text-[#737884]">Site web</div><div className="text-xs text-[#e8eaed] truncate">{lead.websiteUrl ? lead.websiteUrl.replace(/^https?:\/\/(www\.)?/, "") : "—"}</div></div>
          </a>
          <a href={lead.contactEmail ? `mailto:${lead.contactEmail}` : "#"}
             className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${lead.contactEmail ? "border-[#2a2b30] bg-[#212226] hover:border-indigo-300 hover:bg-[#212226]" : "border-[#2a2b30] bg-[#212226] opacity-40 pointer-events-none"}`}>
            <MailIcon className="w-4 h-4 text-[#6366f1] shrink-0" />
            <div className="min-w-0"><div className="text-[10px] font-mono uppercase text-[#737884]">Email</div><div className="text-xs text-[#e8eaed] truncate">{lead.contactEmail ?? "—"}</div></div>
          </a>
          <a href={phone ? `tel:${phone.replace(/\s/g, "")}` : "#"}
             className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${phone ? "border-[#2a2b30] bg-[#212226] hover:border-indigo-300 hover:bg-[#212226]" : "border-[#2a2b30] bg-[#212226] opacity-40 pointer-events-none"}`}>
            <UserIcon className="w-4 h-4 text-[#6366f1] shrink-0" />
            <div className="min-w-0"><div className="text-[10px] font-mono uppercase text-[#737884]">Téléphone</div><div className="text-xs text-[#e8eaed] truncate">{phone ?? "—"}</div></div>
          </a>
          <a href={mapsLink} target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-2 p-3 rounded-xl border border-[#2a2b30] bg-[#212226] hover:border-indigo-300 hover:bg-[#212226] transition-colors">
            <LocationIcon className="w-4 h-4 text-[#6366f1] shrink-0" />
            <div className="min-w-0"><div className="text-[10px] font-mono uppercase text-[#737884]">Google Maps</div><div className="text-xs text-[#e8eaed] truncate">{lead.location ?? "Ouvrir"}</div></div>
          </a>
        </div>

        {/* Corps : audit à gauche, previews à droite */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Colonne principale */}
          <div className="lg:col-span-3 space-y-5">
            {/* Audit expert */}
            <section className="rounded-2xl border border-[#2a2b30] bg-[#212226] p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#e8eaed] font-mono mb-4">Audit technique</h2>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <ScoreTile label="Perf. mobile" value={typeof perf === "number" ? Math.round(perf) : null} />
                <ScoreTile label="SEO" value={typeof seo === "number" ? Math.round(seo) : null} />
                <ScoreTile label="Opportunité" value={typeof techOpp === "number" ? techOpp : null} invert />
              </div>
              {audit.painPoints && audit.painPoints.length > 0 && (
                <div className="mb-4">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#737884] mb-2">Points de douleur détectés</div>
                  <ul className="space-y-1.5">
                    {audit.painPoints.map((p, i) => (
                      <li key={i} className="text-sm text-[#cbd0d8] flex gap-2"><span className="text-red-400 shrink-0">▹</span><span>{p}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {audit.recommendedModules && audit.recommendedModules.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#737884] mb-2">Modules Purity recommandés (interne)</div>
                  <div className="flex flex-wrap gap-1.5">
                    {audit.recommendedModules.map((m, i) => (
                      <span key={i} className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-[#6366f1] border border-indigo-500/30">{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {!perf && !seo && !audit.painPoints?.length && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <p className="text-xs text-[#737884] italic">Lead pas encore enrichi (audit, contact, brouillon manquants).</p>
                  {lead.websiteUrl && <EnrichButton leadId={lead.id} />}
                </div>
              )}
            </section>

            {/* Test Google PageSpeed Insights (hot leads) */}
            {audit.pageSpeed && <PageSpeedSection report={audit.pageSpeed} />}

            {/* Angles générés — à la demande (hors du chemin critique mission) */}
            <section className="rounded-2xl border border-[#2a2b30] bg-[#212226] p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#e8eaed] font-mono">Angles multi-canaux</h2>
                <GenerateAnglesButton leadId={lead.id} hasAngles={!!(audit.seoAudit || audit.linkedinDraft || audit.adsBrief)} />
              </div>
              {audit.seoAudit || audit.linkedinDraft || audit.adsBrief ? (
                <div className="space-y-4">
                  <AngleBox title="Audit SEO comparatif" value={audit.seoAudit} />
                  <AngleBox title="Message LinkedIn (à envoyer manuellement)" value={audit.linkedinDraft} copyable />
                  <AngleBox title="Brief campagne Ads" value={audit.adsBrief} />
                </div>
              ) : (
                <p className="text-xs text-[#737884] italic">Aucun angle généré. Clique sur « Générer les angles multi-canaux » (LinkedIn, Ads, SEO).</p>
              )}
            </section>

            {/* Emails de prospection */}
            {lead.emailDrafts.length > 0 && (
              <section className="rounded-2xl border border-[#2a2b30] bg-[#212226] p-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#e8eaed] font-mono mb-4">Emails de prospection ({lead.emailDrafts.length})</h2>
                <div className="space-y-3">
                  {lead.emailDrafts.map((d) => (
                    <div key={d.id} className="rounded-xl border border-[#2a2b30] bg-[#1a1b1e] p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#212226] text-[#a3a9b4]">{d.status} · {d.tone}</span>
                          {d.status === "SENT" && (
                            <>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${d.openedAt ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-[#212226] text-[#737884] border-[#2a2b30]"}`}>
                                {d.openedAt ? `Ouvert ×${d.openCount}` : "Non ouvert"}
                              </span>
                              {d.clickedAt && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-[#6366f1] border border-indigo-500/30">
                                  Clic ×{d.clickCount}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <CopyButton text={d.subject + "\n\n" + d.bodyHtml.replace(/<[^>]+>/g, "")} label="Copier" />
                      </div>
                      <div className="text-sm font-semibold text-[#e8eaed] mb-1">{d.subject}</div>
                      <div className="text-sm text-[#a3a9b4] leading-relaxed" dangerouslySetInnerHTML={{ __html: d.bodyHtml }} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Colonne previews */}
          <div className="lg:col-span-2 space-y-5">
            {/* Screenshot du site */}
            <section className="rounded-2xl border border-[#2a2b30] bg-[#212226] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2a2b30]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#a3a9b4]">Aperçu du site</span>
                {lead.websiteUrl && <a href={lead.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-[#6366f1] hover:underline">Ouvrir ↗</a>}
              </div>
              {shot ? (
                <a href={lead.websiteUrl!} target="_blank" rel="noopener noreferrer" className="block bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot} alt={`Aperçu de ${lead.companyName}`} loading="lazy" className="w-full h-auto block" />
                </a>
              ) : (
                <div className="p-8 text-center text-xs text-[#737884] italic">Aucun site web connu</div>
              )}
            </section>

            {/* Google Maps */}
            <section className="rounded-2xl border border-[#2a2b30] bg-[#212226] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2a2b30]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#a3a9b4]">Emplacement</span>
                <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-[#6366f1] hover:underline">Maps ↗</a>
              </div>
              <iframe
                title={`Carte ${lead.companyName}`}
                src={mapsEmbed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-[260px] block border-0"
              />
            </section>

            {/* Contact & meta */}
            <section className="rounded-2xl border border-[#2a2b30] bg-[#212226] p-5 space-y-2 text-sm">
              <MetaRow label="Contact" value={lead.contactName || "—"} />
              <MetaRow label="Rôle" value={lead.contactRole || "—"} />
              <MetaRow label="Relances" value={`${lead.relanceCount}/2`} />
              <MetaRow label="Dernier contact" value={lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleDateString("fr-BE") : "—"} />
              <MetaRow label="Ajouté le" value={new Date(lead.createdAt).toLocaleDateString("fr-BE")} />
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreTile({ label, value, invert = false }: { label: string; value: number | null; invert?: boolean }) {
  // invert=true : haut = bon (opportunité). sinon : bas = problème (perf/seo).
  const color =
    value === null ? "text-[#737884]"
      : invert
        ? value >= 60 ? "text-emerald-400" : value >= 35 ? "text-amber-400" : "text-[#a3a9b4]"
        : value >= 70 ? "text-emerald-400" : value >= 40 ? "text-amber-400" : "text-red-400"
  return (
    <div className="rounded-xl border border-[#2a2b30] bg-[#1a1b1e] p-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value === null ? "—" : value}</div>
      <div className="text-[9px] font-mono uppercase tracking-wider text-[#737884] mt-0.5">{label}</div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-mono uppercase tracking-wider text-[#737884]">{label}</span>
      <span className="text-[#cbd0d8] truncate">{value}</span>
    </div>
  )
}

function psiRing(score: number | null) {
  return score === null ? "text-[#737884]" : score >= 90 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400"
}

function PsiScore({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-[#2a2b30] bg-[#1a1b1e] p-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${psiRing(value)}`}>{value ?? "—"}</div>
      <div className="text-[9px] font-mono uppercase tracking-wider text-[#737884] mt-0.5">{label}</div>
    </div>
  )
}

function PsiMetricRow({ m }: { m: PageSpeedMetric }) {
  const color = m.score === null ? "text-[#a3a9b4]" : m.score >= 0.9 ? "text-emerald-400" : m.score >= 0.5 ? "text-amber-400" : "text-red-400"
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[#2a2b30] last:border-0">
      <span className="text-sm text-[#cbd0d8] truncate">{m.title}</span>
      <span className={`text-sm font-mono tabular-nums shrink-0 ${color}`}>{m.displayValue || "—"}</span>
    </div>
  )
}

function PageSpeedSection({ report }: { report: PageSpeedReport }) {
  return (
    <section className="rounded-2xl border border-indigo-500/30 bg-indigo-500/15 p-5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#e8eaed] font-mono flex items-center gap-2">
          <GlobeIcon className="w-4 h-4 text-[#6366f1]" /> Google PageSpeed Insights
        </h2>
        <span className="text-[10px] font-mono text-[#737884]">{report.strategy} · {new Date(report.fetchedAt).toLocaleDateString("fr-BE")}</span>
      </div>
      {report.finalUrl && <p className="text-[11px] font-mono text-[#737884] mb-4 truncate">{report.finalUrl}</p>}

      {report.error ? (
        <p className="text-xs text-amber-400/80 italic">Test indisponible ({report.error}). Il sera relancé au prochain scoring.</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <PsiScore label="Perf." value={report.scores.performance} />
            <PsiScore label="SEO" value={report.scores.seo} />
            <PsiScore label="Accessib." value={report.scores.accessibility} />
            <PsiScore label="Bonnes prat." value={report.scores.bestPractices} />
          </div>
          {report.coreWebVitals.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#737884] mb-1">Core Web Vitals</div>
              {report.coreWebVitals.map((m) => <PsiMetricRow key={m.id} m={m} />)}
            </div>
          )}
          {report.opportunities.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#737884] mb-1">Principales opportunités (gain temps)</div>
              {report.opportunities.map((m) => <PsiMetricRow key={m.id} m={m} />)}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function AngleBox({ title, value, copyable = false }: { title: string; value: unknown; copyable?: boolean }) {
  const entries = readableEntries(value)
  if (entries.length === 0) return null
  return (
    <section className="rounded-2xl border border-[#2a2b30] bg-[#212226] p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#e8eaed] font-mono">{title}</h2>
        {copyable && <CopyButton text={plainText(value)} label="Copier" />}
      </div>
      <div className="space-y-2">
        {entries.map((e, i) => (
          <div key={i} className="text-sm">
            {e.label && <span className="text-[10px] font-mono uppercase tracking-wider text-[#737884] block mb-0.5">{e.label}</span>}
            <span className="text-[#cbd0d8] leading-relaxed whitespace-pre-wrap">{e.text}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
