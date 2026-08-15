import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { notFound } from "next/navigation"
import Link from "next/link"
import { CopyButton } from "./CopyButton"
import { GenerateAnglesButton } from "./GenerateAnglesButton"
import { EnrichButton } from "./EnrichButton"
import { GenerateStrategyButton } from "./GenerateStrategyButton"
import { RefreshPlacesButton } from "./RefreshPlacesButton"
import { ProspectSpotlightHeader } from "./ProspectSpotlightHeader"
import { IABriefCard } from "./IABriefCard"
import { CommandBar } from "./CommandBar"
import { ObjectionDeck } from "./ObjectionDeck"
import { CompactTimeline } from "./CompactTimeline"
import { SpotlightInspectors, type InspectorSpec } from "./SpotlightInspectors"
import { GlobeIcon } from "@/components/icons"
import type { PageSpeedReport, PageSpeedMetric } from "@/lib/acquisition/pageSpeedInsights"
import { scoreBand, scoreTextClass } from "@/lib/acquisition/scoreColor"
import { buildSalesKit, type AngleKey } from "@/lib/acquisition/salesKit"
import { buildLeadKitInput, sectorFromMissionParameters } from "@/lib/acquisition/buildLeadKitInput"
import type { OpportunityStrategy } from "@/lib/agents/acquisition/OpportunityStrategist"

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
  attackPriority?: string
  attackScore?: number
  scoreBreakdown?: { label: string; points: number; maxPoints: number; reason: string }[]
  strategy?: OpportunityStrategy
  strategyGeneratedAt?: string
  googlePlaces?: { rating?: number | null; userRatingsTotal?: number | null; error?: string; fetchedAt?: string }
  hasWhatsApp?: boolean
  hasContactForm?: boolean
  hasBookingWidget?: boolean
  hasAnalytics?: boolean
  isHttps?: boolean
  cmsDetected?: string | null
  socialLinks?: { platform: string; url: string }[]
  contactChannel?: string
  [k: string]: unknown
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
      mission: { select: { name: true, parameters: true } },
      emailDrafts: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!lead) notFound()

  const audit = (lead.auditData as AuditData | null) ?? {}
  const phone = audit.contactPhone ?? null
  const phoneDial = phone ? phone.replace(/\s/g, "") : null
  const score = lead.score ?? null
  const sector = sectorFromMissionParameters(lead.mission?.parameters)
  const kit = buildSalesKit(buildLeadKitInput(lead, sector))
  const primaryAngle = kit.angles[0]
  const attackPriority = audit.attackPriority ?? null
  const attackScore = audit.attackScore ?? null
  const mapsQuery = encodeURIComponent(`${lead.companyName} ${lead.location ?? "Belgique"}`)
  const mapsEmbed = `https://maps.google.com/maps?q=${mapsQuery}&z=15&output=embed`
  const mapsLink = lead.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`
  const shot = lead.websiteUrl
    ? `https://image.thum.io/get/width/900/crop/1100/noanimate/${lead.websiteUrl}`
    : null

  const perf = audit.performanceScore ?? null
  const seo = audit.seoScore ?? null
  const techOpp = audit.techOpportunity ?? null
  const conversionCriterion = audit.scoreBreakdown?.find((c) => c.label === "Conversion")
  const conversionPct = conversionCriterion ? Math.round((conversionCriterion.points / conversionCriterion.maxPoints) * 100) : 0

  // ---- Spotlight Header : anneau segmenté (SEO / Mobile / Conversion) ----
  const ringSegments = [
    { label: "SEO", value: seo ?? 0, color: "var(--chart-1)" },
    { label: "Mobile", value: perf ?? 0, color: "var(--chart-3)" },
    { label: "Conversion", value: conversionPct, color: "var(--chart-5)" },
  ]

  // ---- IA Brief : résumé + pourquoi appeler (jamais figé sur "site web") ----
  const briefSummary = audit.strategy?.executiveSummary ?? kit.oneLiner
  const whyCallBullets = [
    kit.findings[0]?.title,
    `${primaryAngle.label} : ${primaryAngle.dailyPain}`,
    `${kit.lossEstimate.weeklyLow}€–${kit.lossEstimate.weeklyHigh}€/semaine potentiellement en jeu`,
  ].filter((b): b is string => !!b)

  // ---- Inspecteurs (Arc-style) : contenu calculé serveur, transmis en ReactNode ----
  const inspectors: InspectorSpec[] = [
    {
      key: "seo",
      label: "SEO",
      value: seo !== null ? `${Math.round(seo)}` : "—",
      tone: scoreBand(seo) === "excellent" ? "success" : scoreBand(seo) === "moyen" ? "warn" : "critical",
      title: "Référencement (SEO)",
      subtitle: seo !== null ? `Score ${Math.round(seo)}/100` : "Non mesuré",
      content: (
        <div className="space-y-4">
          <ScoreTile label="Score SEO" value={seo !== null ? Math.round(seo) : null} />
          {audit.painPoints && audit.painPoints.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] mb-2">Problèmes détectés</div>
              <ul className="space-y-1.5">
                {audit.painPoints.map((p, i) => <li key={i} className="text-sm text-[#d4d4d8] flex gap-2"><span className="text-red-400 shrink-0">▹</span><span>{p}</span></li>)}
              </ul>
            </div>
          )}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] mb-1">Angle d&apos;acquisition</div>
            <p className="text-sm text-[#d4d4d8]">{kit.angles.find((a) => a.key === "acquisition")?.dailyPain}</p>
          </div>
        </div>
      ),
    },
    {
      key: "performance",
      label: "Performance",
      value: perf !== null ? `${Math.round(perf)}` : "—",
      tone: scoreBand(perf) === "excellent" ? "success" : scoreBand(perf) === "moyen" ? "warn" : "critical",
      title: "Performance mobile",
      subtitle: audit.pageSpeed ? `Test Lighthouse ${audit.pageSpeed.strategy}` : undefined,
      content: (
        <div className="space-y-4">
          <ScoreTile label="Vitesse mobile" value={perf !== null ? Math.round(perf) : null} />
          {audit.pageSpeed ? <PageSpeedBody report={audit.pageSpeed} /> : (
            <p className="text-sm text-[#71717a] italic">Pas encore de test PageSpeed Insights complet pour ce lead.</p>
          )}
        </div>
      ),
    },
    {
      key: "maps",
      label: "Maps",
      icon: <GlobeIcon />,
      title: "Emplacement",
      subtitle: lead.location ?? undefined,
      content: (
        <div className="space-y-3">
          <iframe title={`Carte ${lead.companyName}`} src={mapsEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="w-full h-[280px] rounded-xl border border-white/5" />
          <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[#A855F7] hover:underline">Ouvrir dans Google Maps ↗</a>
        </div>
      ),
    },
    {
      key: "reputation",
      label: "Réputation",
      value: audit.googlePlaces?.rating ? `${audit.googlePlaces.rating}★` : undefined,
      tone: audit.googlePlaces?.rating ? "success" : "neutral",
      title: "Réputation Google",
      content: (
        <div className="space-y-3">
          <RefreshPlacesButton leadId={lead.id} />
          {audit.googlePlaces && !audit.googlePlaces.error && audit.googlePlaces.rating ? (
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold tabular-nums text-emerald-400">{audit.googlePlaces.rating}<span className="text-base text-[#71717a]">/5</span></div>
              <div className="text-sm text-[#d4d4d8]">{audit.googlePlaces.userRatingsTotal ?? 0} avis Google</div>
            </div>
          ) : (
            <p className="text-sm text-[#71717a] italic">Pas encore de données — clique sur « Actualiser » pour récupérer la note et le nombre d&apos;avis.</p>
          )}
        </div>
      ),
    },
    {
      key: "technique",
      label: "Technique",
      value: techOpp !== null ? `${techOpp}` : undefined,
      title: "Audit technique",
      subtitle: lead.websiteUrl ?? "Aucun site connu",
      content: (
        <div className="space-y-5">
          {shot && (
            <a href={lead.websiteUrl!} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shot} alt={`Aperçu de ${lead.companyName}`} loading="lazy" className="w-full h-auto block" />
            </a>
          )}
          <div className="grid grid-cols-2 gap-3">
            <ScoreTile label="Opportunité" value={techOpp} invert />
            <ScoreTile label="Perf. mobile" value={perf !== null ? Math.round(perf) : null} />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] mb-2">Audit conversion</div>
            <div className="space-y-1">
              <ChecklistRow label="Bouton WhatsApp" ok={audit.hasWhatsApp} impact="Les visiteurs mobiles doivent chercher comment vous contacter." />
              <ChecklistRow label="Numéro de téléphone visible" ok={!!phone} impact="Un client pressé abandonne plutôt que de chercher votre numéro." />
              <ChecklistRow label="Réservation en ligne" ok={audit.hasBookingWidget} impact="Chaque rendez-vous doit passer par un appel — impossible en dehors de vos horaires." />
              <ChecklistRow label="Formulaire de contact" ok={audit.hasContactForm} impact="Un visiteur qui ne veut pas téléphoner n'a aucun autre moyen de vous laisser sa demande." />
              <ChecklistRow label="Connexion sécurisée (HTTPS)" ok={audit.isHttps} impact="Certains navigateurs affichent un avertissement « site non sécurisé »." />
              <ChecklistRow label="Suivi analytics" ok={audit.hasAnalytics} impact="Impossible de savoir combien de visiteurs deviennent réellement des demandes." />
            </div>
          </div>
          {audit.cmsDetected && <p className="text-[11px] font-mono text-[#71717a]">Technologie détectée : {audit.cmsDetected}</p>}
          {audit.socialLinks && audit.socialLinks.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] mb-2">Réseaux sociaux détectés</div>
              <div className="flex flex-wrap gap-2">
                {audit.socialLinks.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-white/[0.03] text-[#d4d4d8] border border-white/10 hover:border-[#A855F7]/40 transition-colors capitalize">{s.platform} ↗</a>
                ))}
              </div>
            </div>
          )}
          {audit.recommendedModules && audit.recommendedModules.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] mb-2">Modules Purity recommandés</div>
              <div className="flex flex-wrap gap-1.5">
                {audit.recommendedModules.map((m, i) => <span key={i} className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#A855F7]/10 text-[#d8b4fe] border border-[#A855F7]/25">{m}</span>)}
              </div>
            </div>
          )}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] mb-2">Service recommandé</div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 mb-2">
              <div className="text-[10px] font-mono uppercase text-emerald-300 mb-0.5">{kit.serviceRecommendation.primary.moduleCode}</div>
              <div className="text-sm font-semibold text-[#fafafa]">{kit.serviceRecommendation.primary.label}</div>
              <div className="text-xs text-[#a1a1aa] mt-0.5">{kit.serviceRecommendation.primary.why}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="text-[10px] font-mono uppercase text-[#71717a] mb-0.5">Upsell — {kit.serviceRecommendation.upsell.moduleCode}</div>
              <div className="text-sm font-semibold text-[#fafafa]">{kit.serviceRecommendation.upsell.label}</div>
            </div>
          </div>
          {!perf && !seo && !audit.painPoints?.length && lead.websiteUrl && (
            <EnrichButton leadId={lead.id} />
          )}
        </div>
      ),
    },
    {
      key: "scripts",
      label: "Scripts",
      tone: "neutral",
      title: "Scripts de relance",
      content: (
        <div className="space-y-3">
          <ScriptRow label="Rappel téléphonique" text={kit.channelScripts.relanceCall} />
          <ScriptRow label="SMS" text={kit.channelScripts.sms} />
          <ScriptRow label="WhatsApp" text={kit.channelScripts.whatsapp} />
          <ScriptRow label={`Email — ${kit.channelScripts.emailFollowup.subject}`} text={kit.channelScripts.emailFollowup.body} />
        </div>
      ),
    },
  ]

  if (audit.strategy) {
    inspectors.push({
      key: "strategie",
      label: "Stratégie",
      tone: "ai",
      title: "Stratégie générée par IA",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-[#d4d4d8] leading-relaxed">{audit.strategy.executiveSummary}</p>
          <MetaRow label="Plus gros problème" value={audit.strategy.biggestProblem} />
          <MetaRow label="Meilleur angle" value={audit.strategy.bestAngle} />
          <MetaRow label="Offre idéale" value={audit.strategy.idealOffer} />
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] mb-2">Plan d&apos;action 30 jours</div>
            <ol className="space-y-1.5">
              {audit.strategy.actionPlan30Days.map((step, i) => (
                <li key={i} className="text-sm text-[#d4d4d8] flex gap-2"><span className="text-[#A855F7] font-mono text-xs shrink-0">S{step.week}</span><span>{step.action}</span></li>
              ))}
            </ol>
          </div>
        </div>
      ),
    })
  }

  inspectors.push({
    key: "plus",
    label: "Plus",
    tone: "neutral",
    title: "Angles multi-canaux & historique",
    content: (
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">Angles multi-canaux</div>
            <GenerateAnglesButton leadId={lead.id} hasAngles={!!(audit.seoAudit || audit.linkedinDraft || audit.adsBrief)} />
          </div>
          <div className="grid grid-cols-1 gap-2 mb-3">
            <ChannelRationale label="SEO" angle={kit.angles.find((a) => a.key === "presence" || a.key === "acquisition")} />
            <ChannelRationale label="LinkedIn" angle={kit.angles.find((a) => a.key === "metier" || a.key === "acquisition")} />
            <ChannelRationale label="Google/Meta Ads" angle={kit.angles.find((a) => a.key === "acquisition")} />
          </div>
          {audit.seoAudit || audit.linkedinDraft || audit.adsBrief ? (
            <div className="space-y-3">
              <AngleBox title="Audit SEO comparatif" value={audit.seoAudit} />
              <AngleBox title="Message LinkedIn" value={audit.linkedinDraft} copyable />
              <AngleBox title="Brief campagne Ads" value={audit.adsBrief} />
            </div>
          ) : (
            <p className="text-xs text-[#71717a] italic">Aucun angle généré.</p>
          )}
        </div>
        {lead.emailDrafts.length > 0 && (
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] mb-2">Emails de prospection ({lead.emailDrafts.length})</div>
            <div className="space-y-3">
              {lead.emailDrafts.map((d) => (
                <div key={d.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#a1a1aa]">{d.status} · {d.tone}</span>
                    <CopyButton text={d.subject + "\n\n" + d.bodyHtml.replace(/<[^>]+>/g, "")} label="Copier" />
                  </div>
                  <div className="text-sm font-semibold text-[#fafafa] mb-1">{d.subject}</div>
                  <div className="text-sm text-[#a1a1aa] leading-relaxed" dangerouslySetInnerHTML={{ __html: d.bodyHtml }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ),
  })

  const moreLinks = [
    { href: `/admin/ai/acquisition/crm/${lead.id}/audit`, label: "📄 PDF audit" },
    { href: `/admin/ai/acquisition/crm/${lead.id}/deck`, label: "🖥️ Deck" },
  ]

  const metaStrip = [
    { label: "Contact", value: lead.contactName || "—" },
    { label: "Relances", value: `${lead.relanceCount}/2` },
    { label: "Dernier contact", value: lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleDateString("fr-BE") : "—" },
  ]

  return (
    <div className="h-full overflow-y-auto bg-background p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-5">
        <Link href="/admin/ai/acquisition/crm" className="inline-flex items-center gap-1.5 text-xs font-mono text-[#71717a] hover:text-[#A855F7] transition-colors">
          ← Retour au CRM
        </Link>

        <ProspectSpotlightHeader
          companyName={lead.companyName}
          activity={sector ?? lead.mission?.name ?? null}
          location={lead.location}
          status={lead.status}
          ringSegments={ringSegments}
          ringCenterValue={attackScore !== null ? `${attackScore}` : score !== null ? `${score}` : "—"}
          ringCenterLabel={attackPriority ?? "Score"}
          leadId={lead.id}
          moreLinks={moreLinks}
          metaStrip={metaStrip}
        />

        <CommandBar leadId={lead.id} phone={phone} phoneDial={phoneDial} mapsLink={mapsLink} websiteUrl={lead.websiteUrl} email={lead.contactEmail} />

        <IABriefCard
          summary={briefSummary}
          whyCallBullets={whyCallBullets}
          hookText={kit.callScript.hook}
          topObjection={kit.callScript.objections[0]}
          serviceLabel={kit.serviceRecommendation.primary.label}
          lossRange={`${kit.lossEstimate.weeklyLow}€–${kit.lossEstimate.weeklyHigh}€`}
          ctaSlot={<GenerateStrategyButton leadId={lead.id} hasStrategy={!!audit.strategy} />}
        />

        <SpotlightInspectors inspectors={inspectors} />

        <section className="glass-panel rounded-3xl p-5">
          <h2 className="text-[11px] font-mono uppercase tracking-wider text-[#71717a] mb-3">Objections probables</h2>
          <ObjectionDeck objections={kit.callScript.objections} />
        </section>

        <section className="glass-panel rounded-3xl p-5">
          <h2 className="text-[11px] font-mono uppercase tracking-wider text-[#71717a] mb-3">Historique</h2>
          <CompactTimeline createdAt={lead.createdAt} lastContactedAt={lead.lastContactedAt} relanceCount={lead.relanceCount} emailDrafts={lead.emailDrafts} />
        </section>
      </div>
    </div>
  )
}

// ---- Composants de contenu réutilisés par les inspecteurs ----

function ChecklistRow({ label, ok, impact }: { label: string; ok: boolean | null | undefined; impact: string }) {
  const known = ok !== null && ok !== undefined
  const icon = !known ? "•" : ok ? "✅" : "❌"
  const color = !known ? "text-[#71717a]" : ok ? "text-emerald-400" : "text-red-400"
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className={`shrink-0 ${color}`}>{icon}</span>
      <div className="min-w-0">
        <div className={`text-sm ${known ? "text-[#fafafa]" : "text-[#71717a] italic"}`}>{label}{!known && " — non mesuré"}</div>
        {known && !ok && <div className="text-xs text-[#a1a1aa] mt-0.5">Impact : {impact}</div>}
      </div>
    </div>
  )
}

function ScriptRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">{label}</div>
        <CopyButton text={text} label="Copier" />
      </div>
      <div className="text-sm text-[#d4d4d8] whitespace-pre-wrap leading-relaxed">{text}</div>
    </div>
  )
}

function ChannelRationale({ label, angle }: { label: string; angle?: { label: string; dailyPain: string; score: number; key: AngleKey } }) {
  if (!angle) return null
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-[#A855F7] mb-1">{label}</div>
      <div className="text-xs text-[#d4d4d8] leading-relaxed">{angle.dailyPain}</div>
    </div>
  )
}

function ScoreTile({ label, value, invert = false }: { label: string; value: number | null; invert?: boolean }) {
  const color = scoreTextClass(scoreBand(value, { invert }))
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value === null ? "—" : value}</div>
      <div className="text-[9px] font-mono uppercase tracking-wider text-[#71717a] mt-0.5">{label}</div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717a]">{label}</span>
      <span className="text-[#d4d4d8] truncate">{value}</span>
    </div>
  )
}

function PsiScore({ label, value }: { label: string; value: number | null }) {
  const color = scoreTextClass(scoreBand(value, { thresholds: [90, 50] }))
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value ?? "—"}</div>
      <div className="text-[9px] font-mono uppercase tracking-wider text-[#71717a] mt-0.5">{label}</div>
    </div>
  )
}

function PsiMetricRow({ m }: { m: PageSpeedMetric }) {
  const color = m.score === null ? "text-[#a1a1aa]" : scoreTextClass(scoreBand(m.score, { thresholds: [0.9, 0.5] }))
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-[#d4d4d8] truncate">{m.title}</span>
      <span className={`text-sm font-mono tabular-nums shrink-0 ${color}`}>{m.displayValue || "—"}</span>
    </div>
  )
}

function PageSpeedBody({ report }: { report: PageSpeedReport }) {
  if (report.error) {
    return <p className="text-xs text-amber-400/80 italic">Test indisponible ({report.error}). Il sera relancé au prochain scoring.</p>
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <PsiScore label="Perf." value={report.scores.performance} />
        <PsiScore label="SEO" value={report.scores.seo} />
        <PsiScore label="Accessib." value={report.scores.accessibility} />
        <PsiScore label="Bonnes prat." value={report.scores.bestPractices} />
      </div>
      {report.coreWebVitals.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] mb-1">Core Web Vitals</div>
          {report.coreWebVitals.map((m) => <PsiMetricRow key={m.id} m={m} />)}
        </div>
      )}
      {report.opportunities.length > 0 && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] mb-1">Opportunités (gain temps)</div>
          {report.opportunities.map((m) => <PsiMetricRow key={m.id} m={m} />)}
        </div>
      )}
    </>
  )
}

function AngleBox({ title, value, copyable = false }: { title: string; value: unknown; copyable?: boolean }) {
  const entries = readableEntries(value)
  if (entries.length === 0) return null
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#71717a]">{title}</h3>
        {copyable && <CopyButton text={plainText(value)} label="Copier" />}
      </div>
      <div className="space-y-2">
        {entries.map((e, i) => (
          <div key={i} className="text-sm">
            {e.label && <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] block mb-0.5">{e.label}</span>}
            <span className="text-[#d4d4d8] leading-relaxed whitespace-pre-wrap">{e.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
