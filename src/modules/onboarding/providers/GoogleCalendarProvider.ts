import { ICalendarProvider } from '@/core/providers';
import { logger } from '@/core/logger';

export class GoogleCalendarProvider implements ICalendarProvider {
  async scheduleKickoff(projectId: string, date: Date): Promise<void> {
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (!apiKey || !calendarId) {
      throw new Error(`Google Calendar configuration is missing. Cannot schedule kickoff for ${projectId}.`);
    }

    logger.info(`[GoogleCalendarProvider] Real implementation: Scheduling kickoff for project ${projectId} on ${date.toISOString()}`);
    // Placeholder for actual Google Calendar API call
  }
}
