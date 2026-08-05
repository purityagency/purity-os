import { LeadCapturedEvent } from '../events';
import { IntelligenceAnalyst } from '../IntelligenceAnalyst';
import { CreativeCopywriter } from '../CreativeCopywriter';
import { LeadScoringAnalyst } from '../LeadScoringAnalyst';
import { LinkedInOutreachSpecialist } from '../LinkedInOutreachSpecialist';
import { AdsStrategist } from '../AdsStrategist';
import { logger } from '@/core/logger';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export async function onLeadCaptured(event: LeadCapturedEvent): Promise<void> {
  logger.info(`[Handler] Received LeadCaptured for lead ${event.leadId}`);

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: event.leadId },
      include: { mission: true }
    });

    if (!lead) {
      logger.error(`[Handler] Lead ${event.leadId} not found`);
      return;
    }

    const analyst = new IntelligenceAnalyst();
    await analyst.analyzeLead(event.leadId);

    const copywriter = new CreativeCopywriter();
    await copywriter.draftEmail(event.leadId);

    const scorer = new LeadScoringAnalyst();
    await scorer.scoreLead(event.leadId);

    // Phase 4: Dormant Agents (Simulation Mode)
    let linkedinDraft = null;
    let adsBrief = null;
    try {
      const linkedIn = new LinkedInOutreachSpecialist();
      linkedinDraft = await linkedIn.draftPersonalizedMessage(event.leadId, "Manque de visibilité locale");
    } catch (e) {
      logger.error(`[Handler] Error in LinkedInOutreachSpecialist for ${event.leadId}:`, e);
    }

    try {
      const adsStrategist = new AdsStrategist();
      // Le paramètre sectors est un array (ex: ['HoReCa']) ou absent
      const sectors = (lead.mission?.parameters as { sectors?: unknown } | null)?.sectors;
      const sector = Array.isArray(sectors) && sectors.length > 0 ? sectors[0] : 'Secteur général';
      adsBrief = await adsStrategist.buildCampaignBrief(sector, "Faible flux de nouveaux clients");
    } catch (e) {
      logger.error(`[Handler] Error in AdsStrategist for ${event.leadId}:`, e);
    }

    // Sauvegarde dans auditData pour affichage UI
    if (linkedinDraft || adsBrief) {
      // Re-fetch lead to get updated auditData from Analyst
      const currentLead = await prisma.lead.findUnique({ where: { id: event.leadId }});
      if (currentLead) {
        const currentAuditData: Record<string, unknown> = (typeof currentLead.auditData === 'object' && currentLead.auditData !== null) ? currentLead.auditData as Record<string, unknown> : {};

        await prisma.lead.update({
          where: { id: event.leadId },
          data: {
            auditData: {
              ...currentAuditData,
              linkedinDraft: linkedinDraft || currentAuditData.linkedinDraft,
              adsBrief: adsBrief || currentAuditData.adsBrief
            } as Prisma.InputJsonValue
          }
        });
      }
    }

  } catch (err) {
    logger.error(`[Handler] Error processing LeadCaptured for ${event.leadId}:`, err);
  }
}
