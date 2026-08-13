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

function Slide({ children }: { children: React.ReactNode }) {
  return (
    <section
      style={{
        breakAfter: "page",
        pageBreakAfter: "always",
        minHeight: "150mm",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "56px 64px",
        margin: "0 auto 24px",
        maxWidth: 900,
        background: "#060309",
        color: "#f8fafc",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
      }}
    >
      {children}
    </section>
  )
}

const kicker = (t: string, color = "#7c3aed") => (
  <div style={{ fontSize: 13, textTransform: "uppercase" as const, letterSpacing: 2.5, color, fontWeight: 800, marginBottom: 18 }}>{t}</div>
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
      <style>{`
        @media print { 
          .no-print { display:none !important } 
          @page { margin: 0; size: 1920px 1080px; } 
          body, html { width: 1920px !important; height: 1080px !important; background: #060309 !important; }
          section { border:none !important; box-shadow:none !important; border-radius:0 !important; margin:0 !important; min-height: 1080px !important; width: 1920px !important; padding: 120px 160px !important; break-inside: avoid; page-break-after: always; display: flex !important; flex-direction: column !important; justify-content: center !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        } 
        body { background:#060309; }
      `}</style>
      <div style={{ padding: "20px 0", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>

        {/* Slide 1 — Couverture */}
        <Slide>
          {kicker("Purity Agency · Wallonie", "#a78bfa")}
          <div style={{ fontSize: 16, color: "#71717a", marginBottom: 10 }}>Préparé pour</div>
          <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.05, margin: 0, color: "#f8fafc" }}>{lead.companyName}</h1>
          <p style={{ fontSize: 22, color: "#a1a1aa", marginTop: 24, maxWidth: 680 }}>{kit.oneLiner}</p>
          <div style={{ marginTop: 32, fontSize: 14, color: "#52525b" }}>Comment on va vous aider — et ce que ça change pour vous.</div>
        </Slide>

        {/* Slide 2 — Le constat */}
        <Slide>
          {kicker("Le constat")}
          <h2 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 28px", color: "#f8fafc" }}>Où vous perdez des clients aujourd&apos;hui</h2>
          <div style={{ display: "grid", gap: 20 }}>
            {clientFindings.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: f.severity === "critique" ? "rgba(248,113,113,0.15)" : "rgba(217,119,6,0.15)", color: f.severity === "critique" ? "#f87171" : "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0, fontSize: 16 }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc" }}>{f.title}</div>
                  {f.detail && <div style={{ fontSize: 16, color: "#a1a1aa", marginTop: 4, lineHeight: 1.5 }}>{f.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        </Slide>

        {/* Slide 3 — Les chiffres (si dispo) */}
        {(kit.scores.performance !== null || kit.scores.seo !== null) && (
          <Slide>
            {kicker("Les chiffres, sans filtre")}
            <h2 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 32px", color: "#f8fafc" }}>Votre présence en ligne, mesurée</h2>
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Vitesse mobile", v: kit.scores.performance },
                { label: "Référencement", v: kit.scores.seo },
                { label: "Accessibilité", v: kit.scores.accessibility },
                { label: "Bonnes pratiques", v: kit.scores.bestPractices },
              ].map((x) => (
                <div key={x.label} style={{ flex: 1, textAlign: "center", padding: "28px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16 }}>
                  <div style={{ fontSize: 48, fontWeight: 800, color: x.v === null ? "#3f3f46" : x.v >= 90 ? "#34d399" : x.v >= 50 ? "#fbbf24" : "#f87171" }}>{x.v ?? "—"}</div>
                  <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "#71717a", marginTop: 10 }}>{x.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 14, color: "#52525b", marginTop: 20 }}>Mesures Google Lighthouse (sur 100). Plus c&apos;est bas, plus vous perdez de visiteurs.</div>
          </Slide>
        )}

        {/* Slide 4 — Notre approche */}
        <Slide>
          {kicker("Notre approche", "#a78bfa")}
          <h2 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 28px", color: "#f8fafc" }}>Ce qu&apos;on met en place pour vous</h2>
          <div style={{ display: "grid", gap: 20 }}>
            {kit.valueProps.slice(0, 4).map((v, i) => (
              <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ color: "#7c3aed", fontWeight: 800, fontSize: 22, lineHeight: 1 }}>→</div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc" }}>{v.title}</div>
                  <div style={{ fontSize: 16, color: "#a1a1aa", marginTop: 4, lineHeight: 1.5 }}>{v.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Slide>

        {/* Slide 5 — Pourquoi Purity */}
        <Slide>
          {kicker("Pourquoi Purity")}
          <h2 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 32px", color: "#f8fafc" }}>Une agence locale, orientée résultat</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            {[
              { t: "Basés en Wallonie", d: "On connaît votre marché local et vos clients. Un interlocuteur proche, pas un call-center." },
              { t: "On s'occupe de tout", d: "Conception, textes, mise en ligne, suivi. Vous validez, on exécute." },
              { t: "Pensé pour convertir", d: "Pas un site vitrine de plus : un outil qui vous ramène des appels et des devis." },
              { t: "Sans engagement pour démarrer", d: "On commence par un échange concret. Vous décidez ensuite, en connaissance de cause." },
            ].map((x) => (
              <div key={x.t}>
                <div style={{ fontSize: 19, fontWeight: 700, color: "#7c3aed", marginBottom: 6 }}>{x.t}</div>
                <div style={{ fontSize: 15, color: "#a1a1aa", lineHeight: 1.5 }}>{x.d}</div>
              </div>
            ))}
          </div>
        </Slide>

        {/* Slide 6 — Prochaine étape */}
        <Slide>
          {kicker("Prochaine étape", "#a78bfa")}
          <h2 style={{ fontSize: 40, fontWeight: 800, margin: "0 0 20px", color: "#f8fafc" }}>On en parle 20 minutes ?</h2>
          <p style={{ fontSize: 20, color: "#a1a1aa", maxWidth: 680, lineHeight: 1.5 }}>
            Un échange court et concret : on vous montre précisément quoi prioriser pour <strong style={{ color: "#f8fafc", fontWeight: 700 }}>{lead.companyName}</strong>, et ce que ça peut vous rapporter. Sans engagement.
          </p>
          <div style={{ marginTop: 36, fontSize: 24, fontWeight: 800, color: "#7c3aed" }}>purity-agency.be</div>
        </Slide>

      </div>
    </>
  )
}
