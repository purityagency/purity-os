import { LeadCapturedEvent } from '../events';
import { IntelligenceAnalyst } from '../IntelligenceAnalyst';
import { CreativeCopywriter } from '../CreativeCopywriter';
import { LeadScoringAnalyst } from '../LeadScoringAnalyst';
import { LinkedInOutreachSpecialist } from '../LinkedInOutreachSpecialist';
import { AdsStrategist } from '../AdsStrategist';
import { SEOLocalScout } from '../SEOLocalScout';
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

    // Ne pas appeler le Copywriter (et gaspiller de l'API LLM) si aucun email n'a été trouvé
    const enrichedLead = await prisma.lead.findUnique({ where: { id: event.leadId } });
    if (enrichedLead?.contactEmail) {
      const copywriter = new CreativeCopywriter();
      await copywriter.draftEmail(event.leadId);
    } else {
      logger.info(`[Handler] Aucun email trouvé pour le lead ${event.leadId}, brouillon annulé (Zéro gaspillage).`);
    }

    const scorer = new LeadScoringAnalyst();
    await scorer.scoreLead(event.leadId);

    // Angles d'attaque complémentaires (LinkedIn, Ads, SEO). On ne les génère
    // QUE pour un lead joignable (email trouvé) : inutile de dépenser du quota
    // LLM sur un lead qu'on ne pourra pas contacter, et ça concentre l'effort
    // sur les prospects qui comptent (recherche 2026 : précision > volume).
    // Chaque agent est isolé — l'échec de l'un n'empêche pas les autres.
    if (enrichedLead?.contactEmail) {
      const sectors = (lead.mission?.parameters as { sectors?: unknown } | null)?.sectors;
      const sector = Array.isArray(sectors) && sectors.length > 0 ? String(sectors[0]) : 'Secteur général';

      let linkedinDraft: unknown = null;
      let adsBrief: unknown = null;
      let seoAudit: unknown = null;

      try {
        linkedinDraft = await new LinkedInOutreachSpecialist().draftPersonalizedMessage(event.leadId, "Manque de visibilité locale");
      } catch (e) {
        logger.error(`[Handler] LinkedInOutreachSpecialist échec pour ${event.leadId}:`, e);
      }
      try {
        adsBrief = await new AdsStrategist().buildCampaignBrief(sector, "Faible flux de nouveaux clients");
      } catch (e) {
        logger.error(`[Handler] AdsStrategist échec pour ${event.leadId}:`, e);
      }
      try {
        seoAudit = await new SEOLocalScout().compareAgainstCompetitor(event.leadId, `Concurrent local mieux référencé dans le secteur ${sector}`);
      } catch (e) {
        logger.error(`[Handler] SEOLocalScout échec pour ${event.leadId}:`, e);
      }

      if (linkedinDraft || adsBrief || seoAudit) {
        const currentLead = await prisma.lead.findUnique({ where: { id: event.leadId } });
        if (currentLead) {
          const currentAuditData: Record<string, unknown> =
            (typeof currentLead.auditData === 'object' && currentLead.auditData !== null)
              ? currentLead.auditData as Record<string, unknown>
              : {};

          await prisma.lead.update({
            where: { id: event.leadId },
            data: {
              auditData: {
                ...currentAuditData,
                linkedinDraft: linkedinDraft || currentAuditData.linkedinDraft,
                adsBrief: adsBrief || currentAuditData.adsBrief,
                seoAudit: seoAudit || currentAuditData.seoAudit,
              } as Prisma.InputJsonValue,
            },
          });
        }
      }
    }

  } catch (err) {
    logger.error(`[Handler] Error processing LeadCaptured for ${event.leadId}:`, err);
  }
}
