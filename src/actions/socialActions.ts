"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAdminSession } from "@/lib/session"
import { InstagramAgent, type ContentPlanInput } from "@/lib/agents/social/InstagramAgent"

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
    where: { platform: "INSTAGRAM" },
    orderBy: { createdAt: "desc" },
    take: 60,
  })
}

export async function updateDraftStatus(id: string, status: string) {
  await requireAdminSession()
  await prisma.contentDraft.update({ where: { id }, data: { status } })
  revalidatePath("/admin/ai/social")
}
