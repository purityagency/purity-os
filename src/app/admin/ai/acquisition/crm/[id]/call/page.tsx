import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { notFound } from "next/navigation"
import { PrintButton } from "@/components/PrintButton"
import { buildSalesKit, type LeadKitInput } from "@/lib/acquisition/salesKit"
import type { PageSpeedReport } from "@/lib/acquisition/pageSpeedInsights"

export const dynamic = "force-dynamic"

// Fiche de préparation d'APPEL — document INTERNE (pour toi, pendant le call).
// Peut tout contenir : chiffres, tactiques, objections, notes. À imprimer et
// garder sous les yeux quand tu appelles un prospect (pas de réponse mail +
// numéro dispo). 100% personnalisé, généré sans LLM.

interface AuditData {
  performanceScore?: number | null
  seoScore?: number | null
  techOpportunity?: number | null
  painPoints?: string[]
  recommendedModules?: string[]
  contactPhone?: string | null
  pageSpeed?: PageSpeedReport
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 22, breakInside: "avoid" }}>
      <h2 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "#7c3aed", fontWeight: 800, margin: "0 0 8px", borderBottom: "2px solid #ede9fe", paddingBottom: 4 }}>{title}</h2>
      {children}
    </section>
  )
}

export default async function CallPrepPage({ params }: { params: Promise<{ id: string }> }) {
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
  const phone = audit.contactPhone ?? null

  const kit = buildSalesKit({
    companyName: lead.companyName,
    location: lead.location,
    contactName: lead.contactName,
    contactRole: lead.contactRole,
    websiteUrl: lead.websiteUrl,
    contactPhone: phone,
    sector,
    performanceScore: audit.performanceScore ?? null,
    seoScore: audit.seoScore ?? null,
    painPoints: audit.painPoints,
    pageSpeed: audit.pageSpeed ?? null,
    recommendedModules: audit.recommendedModules ?? null,
    techOpportunity: audit.techOpportunity ?? null,
  } satisfies LeadKitInput)

  const s = kit.callScript

  return (
    <>
      <PrintButton label="Imprimer la fiche d'appel" />
      <style>{`@media print { .no-print { display:none !important } @page { margin: 14mm } } body { background:#f3f4f6 }`}</style>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: 36, background: "#fff", color: "#111827", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", lineHeight: 1.5 }}>

        {/* Bandeau cheat-sheet */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "#111827", color: "#fff", borderRadius: 12, padding: 20, marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#a78bfa", fontWeight: 700 }}>Fiche d&apos;appel</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>{lead.companyName}</div>
            <div style={{ fontSize: 13, color: "#d1d5db", marginTop: 4 }}>
              {lead.contactName || "Contact inconnu"}{lead.contactRole ? ` · ${lead.contactRole}` : ""}{lead.location ? ` · ${lead.location}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {phone ? (
              <a href={`tel:${phone.replace(/\s/g, "")}`} style={{ fontSize: 20, fontWeight: 800, color: "#fff", textDecoration: "none" }}>📞 {phone}</a>
            ) : <div style={{ fontSize: 13, color: "#f59e0b" }}>Pas de numéro connu</div>}
            <div style={{ fontSize: 11, color: "#737884", marginTop: 6 }}>
              Perf {kit.scores.performance ?? "—"} · SEO {kit.scores.seo ?? "—"}
            </div>
          </div>
        </div>

        {/* Rappel express : le point qui accroche */}
        <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10, padding: 14, marginBottom: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>À placer dans les 20 premières secondes</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#78350f" }}>{s.hook}</div>
        </div>

        <Section title="1 · Ouverture">
          <p style={{ margin: "0 0 8px", fontSize: 15 }}>{s.greeting}</p>
          <p style={{ margin: 0, fontSize: 15, color: "#cbd0d8" }}>{s.permission}</p>
        </Section>

        <Section title="2 · Découverte (fais parler, écoute)">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {s.discovery.map((q, i) => <li key={i} style={{ fontSize: 15, marginBottom: 6, color: "#cbd0d8" }}>{q}</li>)}
          </ul>
        </Section>

        <Section title="3 · Pitch (court, orienté résultat)">
          <p style={{ margin: "0 0 8px", fontSize: 15 }}>{s.pitch}</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {s.bridgeToValue.map((v, i) => <li key={i} style={{ fontSize: 14, marginBottom: 5, color: "#cbd0d8" }}>{v}</li>)}
          </ul>
        </Section>

        <Section title="Angles de repli (si le 1er ne prend pas)">
          <div style={{ display: "grid", gap: 8 }}>
            {kit.alternateAngles.map((a, i) => (
              <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5 }}>{a.label}</div>
                <div style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>{a.hook}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="4 · Objections → réponses">
          <div style={{ display: "grid", gap: 10 }}>
            {s.objections.map((o, i) => (
              <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f87171", marginBottom: 3 }}>{o.trigger}</div>
                <div style={{ fontSize: 14, color: "#cbd0d8" }}>{o.response}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="5 · Closing (propose un créneau précis)">
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#065f46", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8, padding: 12 }}>{s.close}</p>
        </Section>

        <Section title="Si messagerie vocale">
          <p style={{ margin: 0, fontSize: 15, color: "#cbd0d8", fontStyle: "italic" }}>{s.voicemail}</p>
        </Section>

        <Section title="Notes de l'appel">
          <div style={{ borderBottom: "1px solid #e5e7eb", height: 26 }} />
          <div style={{ borderBottom: "1px solid #e5e7eb", height: 26 }} />
          <div style={{ borderBottom: "1px solid #e5e7eb", height: 26 }} />
          <div style={{ marginTop: 10, fontSize: 13, color: "#a3a9b4" }}>Résultat : ☐ RDV pris ☐ Rappeler le ______ ☐ Envoyer mail ☐ Pas intéressé</div>
        </Section>

        <div style={{ fontSize: 10, color: "#737884", textAlign: "center", marginTop: 20 }}>Document interne Purity Agency — préparé automatiquement à partir de l&apos;audit du prospect. Amir Kebiyeb · 0465 36 82 65</div>
      </div>
    </>
  )
}
