import { DraftReviewedEvent } from '../events';
import { logger } from '@/core/logger';

// La learning loop ne s'appuie plus sur un fichier disque (`data/daily-logs/
// targeting-feedback.json`) : sur Vercel le FS est en lecture seule, donc
// l'écriture échouait silencieusement en prod. La décision APPROVED/REJECTED
// est déjà persistée durablement dans `EmailDraft.status` (SENT / REJECTED) et
// c'est là que ChiefAcquisitionAI la relit. Ce handler ne fait donc plus que
// tracer l'événement — aucune écriture disque.
export async function onDraftReviewed(event: DraftReviewedEvent): Promise<void> {
  logger.info(
    `[Handler] DraftReviewed pour lead ${event.leadId} (${event.companyName}), action: ${event.action}`
  );
}
