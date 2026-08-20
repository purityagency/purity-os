import { LeadCapturedEvent } from '../events';
import { IntelligenceAnalyst } from '../IntelligenceAnalyst';
import { CreativeCopywriter } from '../CreativeCopywriter';
import { LeadScoringAnalyst } from '../LeadScoringAnalyst';
import { logger } from '@/core/logger';
import { prisma } from '@/lib/prisma';

export async function onLeadCaptured(event: LeadCapturedEvent): Promise<void> {
  logger.info(`[Handler] Received LeadCaptured for lead ${event.leadId}`);

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: event.leadId },
      select: { id: true },
    });

    if (!lead) {
      logger.error(`[Handler] Lead ${event.leadId} not found`);
      return;
    }

    const analyst = new IntelligenceAnalyst();
    await analyst.analyzeLead(event.leadId);

    // On ne rédige un email QUE si on a un vrai email de décideur (nominatif ou
    // rôle-décideur). Un email générique (info@/contact@) part en poubelle : ce
    // lead-là se travaille au TÉLÉPHONE (fiche d'appel), pas au mail. Sans email
    // décideur, on ne gaspille pas d'appel LLM sur un brouillon inutile.
    const enrichedLead = await prisma.lead.findUnique({ where: { id: event.leadId } });
    const quality = (enrichedLead?.auditData as { emailQuality?: string } | null)?.emailQuality;
    const emailUsable = !!enrichedLead?.contactEmail && (quality === 'nominative' || quality === 'role');
    if (emailUsable) {
      const copywriter = new CreativeCopywriter();
      await copywriter.draftEmail(event.leadId);
    } else if (enrichedLead?.contactEmail) {
      logger.info(`[Handler] Email générique pour ${event.leadId} (${quality}) — pas de brouillon, ce lead se travaille au téléphone.`);
    } else {
      logger.info(`[Handler] Aucun email pour le lead ${event.leadId}, brouillon annulé (Zéro gaspillage).`);
    }

    // Scoring déterministe (aucun appel LLM). On NE déclenche PAS PageSpeed ici :
    // il bloquait jusqu'à ~55 s par hot lead dans le chemin critique de la
    // mission. Le cron dédié /api/cron/pagespeed s'en charge en tâche de fond.
    const scorer = new LeadScoringAnalyst();
    await scorer.scoreLead(event.leadId, { runPageSpeed: false });

    // Les angles multi-canaux (LinkedIn / Ads / SEO) NE sont plus générés ici :
    // ils ajoutaient 3 appels LLM sérialisés par lead (~20 s chacun via le
    // throttle Gemini) dans le chemin critique de la mission, pour du contenu
    // qu'on ne consulte que plus tard sur la fiche. Ils sont désormais générés
    // À LA DEMANDE depuis la fiche prospect (action generateLeadAngles).

  } catch (err) {
    logger.error(`[Handler] Error processing LeadCaptured for ${event.leadId}:`, err);
  }
}
