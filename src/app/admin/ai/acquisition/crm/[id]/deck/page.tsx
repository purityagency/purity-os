import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { notFound } from "next/navigation"
import { PrintButton } from "@/components/PrintButton"
import { buildSalesKit, type LeadKitInput } from "@/lib/acquisition/salesKit"
import type { PageSpeedReport } from "@/lib/acquisition/pageSpeedInsights"

export const dynamic = "force-dynamic"

// Deck de présentation CLIENT-FACING — « comment on va vous aider et ce qu'on
// vous apporte ». Une slide par page (imprimable en PDF, présentable à l'écran).
// Règle stricte : aucun code module interne ni prix. 100% personnalisé, sans LLM.

interface AuditData {
  performanceScore?: number | null
  seoScore?: number | null
  techOpportunity?: number | null
  painPoints?: string[]
  pageSpeed?: PageSpeedReport
}

function Slide({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <section
      style={{
        breakAfter: "page",
        pageBreakAfter: "always",
        minHeight: "150mm",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "48px 52px",
        margin: "0 auto 20px",
        maxWidth: 900,
        background: dark ? "#0b0b12" : "#ffffff",
        color: dark ? "#ffffff" : "#111827",
        borderRadius: 14,
        border: dark ? "none" : "1px solid #e5e7eb",
      }}
    >
      {children}
    </section>
  )
}

const kicker = (t: string, color = "#7c3aed") => (
  <div style={{ fontSize: 12, textTransform: "uppercase" as const, letterSpacing: 2, color, fontWeight: 800, marginBottom: 14 }}>{t}</div>
)

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession()
  const { id } = await params

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { mission: { select: { parameters: true } } },
  })
  if (!lead) notFound()

  const audit = (lead.auditData as AuditData | null) ?? {}
  const sectors = (lead.mission?.parameters as { sectors?: unknown } | null)?.sectors
  const sector = Array.isArray(sectors) && sectors.length > 0 ? String(sectors[0]) : null

  const kit = buildSalesKit({
    companyName: lead.companyName,
    location: lead.location,
    contactName: lead.contactName,
    contactRole: lead.contactRole,
    websiteUrl: lead.websiteUrl,
    contactPhone: audit === null ? null : (audit as { contactPhone?: string }).contactPhone ?? null,
    sector,
    performanceScore: audit.performanceScore ?? null,
    seoScore: audit.seoScore ?? null,
    painPoints: audit.painPoints,
    pageSpeed: audit.pageSpeed ?? null,
  } satisfies LeadKitInput)

  const clientFindings = kit.findings.slice(0, 3)

  return (
    <>
      <PrintButton label="Enregistrer le deck en PDF" />
      <style>{`@media print { .no-print { display:none !important } @page { margin: 0; size: A4 landscape } section { border:none !important } } body { background:#f3f4f6 }`}</style>
      <div style={{ padding: 20, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>

        {/* Slide 1 — Couverture */}
        <Slide dark>
          {kicker("Purity Agency · Wallonie", "#a78bfa")}
          <div style={{ fontSize: 15, color: "#9ca3af", marginBottom: 8 }}>Préparé pour</div>
          <h1 style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.05, margin: 0 }}>{lead.companyName}</h1>
          <p style={{ fontSize: 20, color: "#d1d5db", marginTop: 20, maxWidth: 640 }}>{kit.oneLiner}</p>
          <div style={{ marginTop: 28, fontSize: 13, color: "#6b7280" }}>Comment on va vous aider — et ce que ça change pour vous.</div>
        </Slide>

        {/* Slide 2 — Le constat */}
        <Slide>
          {kicker("Le constat")}
          <h2 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 20px" }}>Où vous perdez des clients aujourd&apos;hui</h2>
          <div style={{ display: "grid", gap: 14 }}>
            {clientFindings.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: f.severity === "critique" ? "#fee2e2" : "#fef3c7", color: f.severity === "critique" ? "#dc2626" : "#d97706", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{f.title}</div>
                  {f.detail && <div style={{ fontSize: 15, color: "#4b5563", marginTop: 3 }}>{f.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        </Slide>

        {/* Slide 3 — Les chiffres (si dispo) */}
        {(kit.scores.performance !== null || kit.scores.seo !== null) && (
          <Slide>
            {kicker("Les chiffres, sans filtre")}
            <h2 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 24px" }}>Votre présence en ligne, mesurée</h2>
            <div style={{ display: "flex", gap: 16 }}>
              {[
                { label: "Vitesse mobile", v: kit.scores.performance },
                { label: "Référencement", v: kit.scores.seo },
                { label: "Accessibilité", v: kit.scores.accessibility },
                { label: "Bonnes pratiques", v: kit.scores.bestPractices },
              ].map((x) => (
                <div key={x.label} style={{ flex: 1, textAlign: "center", padding: "20px 8px", border: "1px solid #e5e7eb", borderRadius: 12 }}>
                  <div style={{ fontSize: 40, fontWeight: 800, color: x.v === null ? "#9ca3af" : x.v >= 90 ? "#059669" : x.v >= 50 ? "#d97706" : "#dc2626" }}>{x.v ?? "—"}</div>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#6b7280", marginTop: 6 }}>{x.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 16 }}>Mesures Google Lighthouse (sur 100). Plus c&apos;est bas, plus vous perdez de visiteurs.</div>
          </Slide>
        )}

        {/* Slide 4 — Notre approche */}
        <Slide dark>
          {kicker("Notre approche", "#a78bfa")}
          <h2 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 22px" }}>Ce qu&apos;on met en place pour vous</h2>
          <div style={{ display: "grid", gap: 16 }}>
            {kit.valueProps.slice(0, 4).map((v, i) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ color: "#a78bfa", fontWeight: 800, fontSize: 18 }}>→</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{v.title}</div>
                  <div style={{ fontSize: 15, color: "#d1d5db", marginTop: 2 }}>{v.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Slide>

        {/* Slide 5 — Pourquoi Purity */}
        <Slide>
          {kicker("Pourquoi Purity")}
          <h2 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 22px" }}>Une agence locale, orientée résultat</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {[
              { t: "Basés en Wallonie", d: "On connaît votre marché local et vos clients. Un interlocuteur proche, pas un call-center." },
              { t: "On s'occupe de tout", d: "Conception, textes, mise en ligne, suivi. Vous validez, on exécute." },
              { t: "Pensé pour convertir", d: "Pas un site vitrine de plus : un outil qui vous ramène des appels et des devis." },
              { t: "Sans engagement pour démarrer", d: "On commence par un échange concret. Vous décidez ensuite, en connaissance de cause." },
            ].map((x) => (
              <div key={x.t}>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#7c3aed" }}>{x.t}</div>
                <div style={{ fontSize: 14, color: "#4b5563", marginTop: 3 }}>{x.d}</div>
              </div>
            ))}
          </div>
        </Slide>

        {/* Slide 6 — Prochaine étape */}
        <Slide dark>
          {kicker("Prochaine étape", "#a78bfa")}
          <h2 style={{ fontSize: 34, fontWeight: 800, margin: "0 0 16px" }}>On en parle 20 minutes ?</h2>
          <p style={{ fontSize: 18, color: "#d1d5db", maxWidth: 620 }}>
            Un échange court et concret : on vous montre précisément quoi prioriser pour {lead.companyName}, et ce que ça peut vous rapporter. Sans engagement.
          </p>
          <div style={{ marginTop: 28, fontSize: 20, fontWeight: 800, color: "#a78bfa" }}>purity-agency.be</div>
        </Slide>

      </div>
    </>
  )
}
