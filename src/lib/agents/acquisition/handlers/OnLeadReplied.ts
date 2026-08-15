import { LeadRepliedEvent } from '../events';
import { CreativeCopywriter } from '../CreativeCopywriter';
import { logger } from '@/core/logger';
import { prisma } from '@/lib/prisma';

export async function onLeadReplied(event: LeadRepliedEvent): Promise<void> {
  logger.info(`[Handler] Received LeadReplied for lead ${event.leadId}`);

  try {
    const lead = await prisma.lead.findUnique({ where: { id: event.leadId }, select: { id: true, companyName: true } });
    if (!lead) {
      logger.error(`[Handler] Lead ${event.leadId} not found`);
      return;
    }

    const copywriter = new CreativeCopywriter();
    await copywriter.draftReply(event.leadId, event.replyText, event.replySubject);
  } catch (error) {
    logger.error(`[Handler] Échec draftReply pour ${event.leadId}: ${error}`);
  }
}
