import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { notFound } from "next/navigation"
import Link from "next/link"
import { CopyButton } from "./CopyButton"
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
    <div className="h-full overflow-y-auto bg-[#060309] p-4 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Retour */}
        <Link href="/admin/ai/acquisition/crm" className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-violet-300 transition-colors">
          ← Retour au CRM
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-white/5 pb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              <span>Fiche prospection</span>
              <span className="text-zinc-700">·</span>
              <span>Source {lead.source}</span>
              {audit.lastAuditAt && <><span className="text-zinc-700">·</span><span>Audité le {new Date(audit.lastAuditAt).toLocaleDateString("fr-BE")}</span></>}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight truncate">{lead.companyName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <StatusBadge status={lead.status} />
              {lead.mission?.name && <span className="text-[11px] font-mono text-zinc-500">Mission : {lead.mission.name}</span>}
              {lead.optedOut && <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">Désinscrit</span>}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-4">
            <a
              href={`/admin/ai/acquisition/crm/${lead.id}/audit`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono px-3 py-2 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 transition-colors whitespace-nowrap"
            >
              📄 PDF d&apos;audit
            </a>
            {score !== null && (
              <div className="text-right">
                <div className={`text-4xl font-bold tabular-nums ${scoreColor(score)}`}>{score}<span className="text-lg text-zinc-600">/100</span></div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Score qualité</div>
              </div>
            )}
          </div>
        </div>

        {/* Actions rapides / liens */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <a href={lead.websiteUrl || "#"} target="_blank" rel="noopener noreferrer"
             className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${lead.websiteUrl ? "border-white/10 bg-white/[0.02] hover:border-violet-500/40 hover:bg-white/[0.04]" : "border-white/5 bg-white/[0.01] opacity-40 pointer-events-none"}`}>
            <GlobeIcon className="w-4 h-4 text-violet-400 shrink-0" />
            <div className="min-w-0"><div className="text-[10px] font-mono uppercase text-zinc-500">Site web</div><div className="text-xs text-white truncate">{lead.websiteUrl ? lead.websiteUrl.replace(/^https?:\/\/(www\.)?/, "") : "—"}</div></div>
          </a>
          <a href={lead.contactEmail ? `mailto:${lead.contactEmail}` : "#"}
             className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${lead.contactEmail ? "border-white/10 bg-white/[0.02] hover:border-violet-500/40 hover:bg-white/[0.04]" : "border-white/5 bg-white/[0.01] opacity-40 pointer-events-none"}`}>
            <MailIcon className="w-4 h-4 text-violet-400 shrink-0" />
            <div className="min-w-0"><div className="text-[10px] font-mono uppercase text-zinc-500">Email</div><div className="text-xs text-white truncate">{lead.contactEmail ?? "—"}</div></div>
          </a>
          <a href={phone ? `tel:${phone.replace(/\s/g, "")}` : "#"}
             className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${phone ? "border-white/10 bg-white/[0.02] hover:border-violet-500/40 hover:bg-white/[0.04]" : "border-white/5 bg-white/[0.01] opacity-40 pointer-events-none"}`}>
            <UserIcon className="w-4 h-4 text-violet-400 shrink-0" />
            <div className="min-w-0"><div className="text-[10px] font-mono uppercase text-zinc-500">Téléphone</div><div className="text-xs text-white truncate">{phone ?? "—"}</div></div>
          </a>
          <a href={mapsLink} target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:border-violet-500/40 hover:bg-white/[0.04] transition-colors">
            <LocationIcon className="w-4 h-4 text-violet-400 shrink-0" />
            <div className="min-w-0"><div className="text-[10px] font-mono uppercase text-zinc-500">Google Maps</div><div className="text-xs text-white truncate">{lead.location ?? "Ouvrir"}</div></div>
          </a>
        </div>

        {/* Corps : audit à gauche, previews à droite */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Colonne principale */}
          <div className="lg:col-span-3 space-y-5">
            {/* Audit expert */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono mb-4">Audit technique</h2>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <ScoreTile label="Perf. mobile" value={typeof perf === "number" ? Math.round(perf) : null} />
                <ScoreTile label="SEO" value={typeof seo === "number" ? Math.round(seo) : null} />
                <ScoreTile label="Opportunité" value={typeof techOpp === "number" ? techOpp : null} invert />
              </div>
              {audit.painPoints && audit.painPoints.length > 0 && (
                <div className="mb-4">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">Points de douleur détectés</div>
                  <ul className="space-y-1.5">
                    {audit.painPoints.map((p, i) => (
                      <li key={i} className="text-sm text-zinc-300 flex gap-2"><span className="text-red-400 shrink-0">▹</span><span>{p}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {audit.recommendedModules && audit.recommendedModules.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">Modules Purity recommandés (interne)</div>
                  <div className="flex flex-wrap gap-1.5">
                    {audit.recommendedModules.map((m, i) => (
                      <span key={i} className="text-[11px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {!perf && !seo && !audit.painPoints?.length && (
                <p className="text-xs text-zinc-500 italic">Pas encore d&apos;audit détaillé pour ce lead.</p>
              )}
            </section>

            {/* Test Google PageSpeed Insights (hot leads) */}
            {audit.pageSpeed && <PageSpeedSection report={audit.pageSpeed} />}

            {/* Angles générés */}
            <AngleBox title="Audit SEO comparatif" value={audit.seoAudit} />
            <AngleBox title="Message LinkedIn (à envoyer manuellement)" value={audit.linkedinDraft} copyable />
            <AngleBox title="Brief campagne Ads" value={audit.adsBrief} />

            {/* Emails de prospection */}
            {lead.emailDrafts.length > 0 && (
              <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono mb-4">Emails de prospection ({lead.emailDrafts.length})</h2>
                <div className="space-y-3">
                  {lead.emailDrafts.map((d) => (
                    <div key={d.id} className="rounded-xl border border-white/5 bg-black/30 p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-400">{d.status} · {d.tone}</span>
                          {d.status === "SENT" && (
                            <>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${d.openedAt ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-white/5 text-zinc-500 border-white/10"}`}>
                                {d.openedAt ? `Ouvert ×${d.openCount}` : "Non ouvert"}
                              </span>
                              {d.clickedAt && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                                  Clic ×{d.clickCount}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <CopyButton text={d.subject + "\n\n" + d.bodyHtml.replace(/<[^>]+>/g, "")} label="Copier" />
                      </div>
                      <div className="text-sm font-semibold text-white mb-1">{d.subject}</div>
                      <div className="text-sm text-zinc-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: d.bodyHtml }} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Colonne previews */}
          <div className="lg:col-span-2 space-y-5">
            {/* Screenshot du site */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Aperçu du site</span>
                {lead.websiteUrl && <a href={lead.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-violet-400 hover:underline">Ouvrir ↗</a>}
              </div>
              {shot ? (
                <a href={lead.websiteUrl!} target="_blank" rel="noopener noreferrer" className="block bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot} alt={`Aperçu de ${lead.companyName}`} loading="lazy" className="w-full h-auto block" />
                </a>
              ) : (
                <div className="p-8 text-center text-xs text-zinc-600 italic">Aucun site web connu</div>
              )}
            </section>

            {/* Google Maps */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Emplacement</span>
                <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-violet-400 hover:underline">Maps ↗</a>
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
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-2 text-sm">
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
    value === null ? "text-zinc-600"
      : invert
        ? value >= 60 ? "text-emerald-400" : value >= 35 ? "text-amber-400" : "text-zinc-400"
        : value >= 70 ? "text-emerald-400" : value >= 40 ? "text-amber-400" : "text-red-400"
  return (
    <div className="rounded-xl border border-white/5 bg-black/30 p-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value === null ? "—" : value}</div>
      <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 mt-0.5">{label}</div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="text-zinc-300 truncate">{value}</span>
    </div>
  )
}

function psiRing(score: number | null) {
  return score === null ? "text-zinc-600" : score >= 90 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400"
}

function PsiScore({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/30 p-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${psiRing(value)}`}>{value ?? "—"}</div>
      <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 mt-0.5">{label}</div>
    </div>
  )
}

function PsiMetricRow({ m }: { m: PageSpeedMetric }) {
  const color = m.score === null ? "text-zinc-400" : m.score >= 0.9 ? "text-emerald-400" : m.score >= 0.5 ? "text-amber-400" : "text-red-400"
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-zinc-300 truncate">{m.title}</span>
      <span className={`text-sm font-mono tabular-nums shrink-0 ${color}`}>{m.displayValue || "—"}</span>
    </div>
  )
}

function PageSpeedSection({ report }: { report: PageSpeedReport }) {
  return (
    <section className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.03] p-5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
          <GlobeIcon className="w-4 h-4 text-violet-400" /> Google PageSpeed Insights
        </h2>
        <span className="text-[10px] font-mono text-zinc-500">{report.strategy} · {new Date(report.fetchedAt).toLocaleDateString("fr-BE")}</span>
      </div>
      {report.finalUrl && <p className="text-[11px] font-mono text-zinc-500 mb-4 truncate">{report.finalUrl}</p>}

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
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">Core Web Vitals</div>
              {report.coreWebVitals.map((m) => <PsiMetricRow key={m.id} m={m} />)}
            </div>
          )}
          {report.opportunities.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">Principales opportunités (gain temps)</div>
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
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono">{title}</h2>
        {copyable && <CopyButton text={plainText(value)} label="Copier" />}
      </div>
      <div className="space-y-2">
        {entries.map((e, i) => (
          <div key={i} className="text-sm">
            {e.label && <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-0.5">{e.label}</span>}
            <span className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{e.text}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
