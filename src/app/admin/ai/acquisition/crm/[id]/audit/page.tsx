import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { notFound } from "next/navigation"
import { PrintButton } from "@/components/PrintButton"
import { buildSalesKit } from "@/lib/acquisition/salesKit"
import type { PageSpeedReport } from "@/lib/acquisition/pageSpeedInsights"
import { scoreBand, scoreLabel, scoreHexColor } from "@/lib/acquisition/scoreColor"

export const dynamic = "force-dynamic"

// Rapport d'audit CLIENT-FACING (destiné à être enregistré en PDF et présenté /
// attaché en RDV). Règle stricte : AUCUN code module interne (M07) ni prix — ce
// document parle au prospect, pas à l'équipe. Thème clair, brandé Purity.

interface AuditData {
  performanceScore?: number | null
  seoScore?: number | null
  techOpportunity?: number | null
  painPoints?: string[]
  lastAuditAt?: string
  pageSpeed?: PageSpeedReport
}

function grade(score: number | null): { label: string; color: string } {
  const band = scoreBand(score, { thresholds: [90, 50] })
  return { label: scoreLabel(band), color: scoreHexColor(band) }
}

function ScoreBlock({ label, score }: { label: string; score: number | null }) {
  const g = grade(score)
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "16px 8px", border: "1px solid #e5e7eb", borderRadius: 10 }}>
      <div style={{ fontSize: 34, fontWeight: 800, color: g.color, lineHeight: 1 }}>{score ?? "—"}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: g.color, marginTop: 4 }}>{g.label}</div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "#a3a9b4", marginTop: 6 }}>{label}</div>
    </div>
  )
}

export default async function AuditReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession()
  const { id } = await params

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { mission: { select: { parameters: true } } },
  })
  if (!lead) notFound()

  const audit = (lead.auditData as AuditData | null) ?? {}
  const psi = audit.pageSpeed && !audit.pageSpeed.error ? audit.pageSpeed : null

  // On privilégie les scores PSI réels ; sinon on retombe sur l'audit
  // d'enrichissement. Aucun code interne exposé.
  const perf = psi?.scores.performance ?? audit.performanceScore ?? null
  const seo = psi?.scores.seo ?? audit.seoScore ?? null
  const a11y = psi?.scores.accessibility ?? null
  const bp = psi?.scores.bestPractices ?? null
  const dateStr = new Date().toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })

  const sectors = (lead.mission?.parameters as { sectors?: unknown } | null)?.sectors
  const sector = Array.isArray(sectors) && sectors.length > 0 ? String(sectors[0]) : null
  const kit = buildSalesKit({
    companyName: lead.companyName,
    location: lead.location,
    contactName: lead.contactName,
    contactRole: lead.contactRole,
    websiteUrl: lead.websiteUrl,
    contactPhone: null,
    sector,
    performanceScore: audit.performanceScore ?? null,
    seoScore: audit.seoScore ?? null,
    painPoints: audit.painPoints,
    pageSpeed: audit.pageSpeed ?? null,
  })

  return (
    <>
      <PrintButton />
      <style>{`
        @media print { .no-print { display: none !important; } @page { margin: 16mm; } }
        body { background: #f3f4f6; }
      `}</style>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: 40, background: "#1a1b1e", color: "#111827", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
        {/* En-tête brandé */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #111827", paddingBottom: 16, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>PURITY<span style={{ color: "#7c3aed" }}>.</span>AGENCY</div>
            <div style={{ fontSize: 12, color: "#a3a9b4", marginTop: 2 }}>Audit de présence digitale</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#a3a9b4" }}>{dateStr}</div>
        </div>

        {/* Prospect */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#7c3aed", fontWeight: 700 }}>Préparé pour</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "4px 0 2px" }}>{lead.companyName}</h1>
          {lead.websiteUrl && <div style={{ fontSize: 13, color: "#a3a9b4" }}>{lead.websiteUrl.replace(/^https?:\/\/(www\.)?/, "")}{lead.location ? ` · ${lead.location}` : ""}</div>}
          <p style={{ fontSize: 15, color: "#cbd0d8", marginTop: 12, maxWidth: 640, lineHeight: 1.5 }}>{kit.oneLiner}</p>
        </div>

        {/* Scores */}
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Diagnostic technique</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <ScoreBlock label="Vitesse mobile" score={perf} />
          <ScoreBlock label="Référencement" score={seo} />
          <ScoreBlock label="Accessibilité" score={a11y} />
          <ScoreBlock label="Bonnes pratiques" score={bp} />
        </div>
        <div style={{ fontSize: 10, color: "#737884", marginBottom: 24 }}>
          Mesures Google Lighthouse (0-100){psi ? `, testé le ${new Date(psi.fetchedAt).toLocaleDateString("fr-BE")} sur mobile` : ""}.
        </div>

        {/* Core Web Vitals */}
        {psi && psi.coreWebVitals.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Expérience de chargement</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {psi.coreWebVitals.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 0", color: "#cbd0d8" }}>{m.title}</td>
                    <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 700, color: (m.score ?? 1) >= 0.9 ? "#34d399" : (m.score ?? 0) >= 0.5 ? "#d97706" : "#f87171" }}>{m.displayValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Constat — langage humain, dérivé des vrais chiffres */}
        {kit.findings.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Ce qui vous coûte des clients aujourd&apos;hui</div>
            <div style={{ display: "grid", gap: 10 }}>
              {kit.findings.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ color: f.severity === "critique" ? "#f87171" : "#d97706", fontWeight: 800, fontSize: 16 }}>›</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{f.title}</div>
                    {f.detail && <div style={{ fontSize: 14, color: "#4b5563", marginTop: 2 }}>{f.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opportunités PSI chiffrées */}
        {psi && psi.opportunities.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Leviers d&apos;amélioration prioritaires</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {psi.opportunities.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 0", color: "#cbd0d8" }}>{m.title}</td>
                    <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 700, color: "#7c3aed" }}>{m.displayValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Ce qu'on vous apporte */}
        <div style={{ marginBottom: 24, breakInside: "avoid" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Ce qu&apos;on vous apporte</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {kit.valueProps.map((v, i) => (
              <div key={i} style={{ border: "1px solid #ede9fe", background: "#faf5ff", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#6d28d9" }}>{v.title}</div>
                <div style={{ fontSize: 13, color: "#4b5563", marginTop: 3 }}>{v.detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ background: "#111827", color: "#1a1b1e", borderRadius: 12, padding: 24, marginTop: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>On corrige tout ça pour vous.</div>
          <div style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.6 }}>
            Purity Agency conçoit et déploie des sites rapides, bien référencés et pensés pour convertir.
            Parlons de votre projet — un échange de 20 minutes suffit pour vous dire précisément quoi prioriser.
          </div>
          <div style={{ fontSize: 13, marginTop: 12, color: "#a78bfa", fontWeight: 700 }}>purity-agency.be</div>
        </div>

        <div style={{ fontSize: 10, color: "#737884", marginTop: 20, textAlign: "center" }}>
          Audit réalisé par Purity Agency à partir de données publiques (Google Lighthouse). Document sans engagement.
        </div>
      </div>
    </>
  )
}
