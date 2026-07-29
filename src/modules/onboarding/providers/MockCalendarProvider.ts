import { ICalendarProvider } from '@/core/providers';
import { logger } from '@/core/logger';

export class MockCalendarProvider implements ICalendarProvider {
  async scheduleKickoff(projectId: string, date: Date): Promise<void> {
    logger.info(`[MockCalendarProvider] Scheduling kickoff for project ${projectId} at ${date.toISOString()}`);
    await new Promise(resolve => setTimeout(resolve, 150));
  }
}
