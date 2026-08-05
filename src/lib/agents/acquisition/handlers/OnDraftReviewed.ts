import { DraftReviewedEvent } from '../events';
import { logger } from '@/core/logger';
import * as fs from 'fs';
import * as path from 'path';

export async function onDraftReviewed(event: DraftReviewedEvent): Promise<void> {
  logger.info(`[Handler] Received DraftReviewed for lead ${event.leadId}, action: ${event.action}`);

  try {
    const feedbackPath = path.join(process.cwd(), 'data/daily-logs/targeting-feedback.json');
    let feedback = [];
    
    if (fs.existsSync(feedbackPath)) {
      const content = fs.readFileSync(feedbackPath, 'utf8');
      if (content) {
        feedback = JSON.parse(content);
      }
    }

    feedback.push({
      leadId: event.leadId,
      companyName: event.companyName,
      action: event.action,
      date: new Date().toISOString()
    });

    // Keep only the last 100 feedbacks to avoid bloat
    if (feedback.length > 100) {
      feedback = feedback.slice(feedback.length - 100);
    }

    fs.writeFileSync(feedbackPath, JSON.stringify(feedback, null, 2), 'utf8');
    logger.info(`[Handler] Feedback for ${event.companyName} saved to learning loop.`);
  } catch (err) {
    logger.error(`[Handler] Error processing DraftReviewed for ${event.leadId}:`, err);
  }
}
