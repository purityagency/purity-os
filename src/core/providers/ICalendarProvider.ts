export interface ICalendarProvider {
  scheduleKickoff(projectId: string, date: Date): Promise<void>;
}
