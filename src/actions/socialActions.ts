"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAdminSession } from "@/lib/session"
import { InstagramAgent, type ContentPlanInput } from "@/lib/agents/social/InstagramAgent"
import { SocialProspector } from "@/lib/agents/social/SocialProspector"

// Campagne "conteneur" par défaut pour la présence Instagram continue.
// (Le modèle ContentDraft exige un campaignId ; on regroupe tout le flux
// Instagram sous une campagne persistante unique tant qu'on n'a pas de
// campagnes datées.)
const IG_CAMPAIGN_NAME = "Présence Instagram"

async function ensureInstagramCampaign(): Promise<string> {
  const existing = await prisma.brandCampaign.findFirst({ where: { name: IG_CAMPAIGN_NAME } })
  if (existing) return existing.id
  const created = await prisma.brandCampaign.create({
    data: { name: IG_CAMPAIGN_NAME, objective: "Acquérir des clients via Instagram", status: "ACTIVE" },
  })
  return created.id
}

export async function generateInstagramPlan(input: ContentPlanInput = {}) {
  await requireAdminSession()
  const campaignId = await ensureInstagramCampaign()

  const agent = new InstagramAgent()
  const items = await agent.generateContentPlan(input)

  await prisma.contentDraft.createMany({
    data: items.map((it) => ({
      campaignId,
      platform: "INSTAGRAM",
      format: it.format,
      // postText = texte prêt-à-coller (légende + CTA + hashtags).
      postText: `${it.caption}\n\n${it.cta}\n\n${it.hashtags.map((h) => "#" + h).join(" ")}`,
      structured: it as object,
      status: "PENDING_GUARDIAN_APPROVAL",
    })),
  })

  revalidatePath("/admin/ai/social")
  return { count: items.length }
}

export async function listInstagramDrafts() {
  await requireAdminSession()
  return prisma.contentDraft.findMany({
    where: { platform: "INSTAGRAM", format: { not: "DM" } },
    orderBy: { createdAt: "desc" },
    take: 60,
  })
}

export async function listDmDrafts() {
  await requireAdminSession()
  return prisma.contentDraft.findMany({
    where: { platform: "INSTAGRAM", format: "DM" },
    orderBy: { createdAt: "desc" },
    take: 40,
  })
}

// Prospection DM : prend les meilleurs leads RÉELS du CRM (enrichis, non
// désinscrits, jamais encore mis en DM), et rédige un opener value-first pour
// chacun. Les DM sont stockés comme ContentDraft format="DM" pour rester dans
// le même flux de validation.
export async function generateDmBatch(count = 3) {
  await requireAdminSession()
  const campaignId = await ensureInstagramCampaign()

  // Leads déjà traités en DM (pour ne pas re-drafter le même).
  const already = await prisma.contentDraft.findMany({
    where: { platform: "INSTAGRAM", format: "DM" },
    select: { structured: true },
  })
  const doneLeadIds = new Set(
    already.map((d) => (d.structured as { leadId?: string } | null)?.leadId).filter(Boolean) as string[],
  )

  const leads = await prisma.lead.findMany({
    where: { optedOut: false, status: { in: ["ENRICHED", "DRAFTED", "NEW"] } },
    orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
    take: 40,
  })
  const targets = leads.filter((l) => !doneLeadIds.has(l.id)).slice(0, Math.min(8, Math.max(1, count)))

  const prospector = new SocialProspector()
  let created = 0
  for (const lead of targets) {
    try {
      const dm = await prospector.draftInstagramDM(lead.id)
      await prisma.contentDraft.create({
        data: {
          campaignId,
          platform: "INSTAGRAM",
          format: "DM",
          postText: dm.message,
          structured: { ...dm, leadId: lead.id, companyName: lead.companyName, score: lead.score, location: lead.location },
          status: "PENDING_GUARDIAN_APPROVAL",
        },
      })
      created++
    } catch {
      // On saute silencieusement un lead qui échoue (ex: désinscrit) — le lot continue.
    }
  }

  revalidatePath("/admin/ai/social")
  return { created, requested: targets.length }
}

export async function updateDraftStatus(id: string, status: string) {
  await requireAdminSession()
  await prisma.contentDraft.update({ where: { id }, data: { status } })
  revalidatePath("/admin/ai/social")
}
