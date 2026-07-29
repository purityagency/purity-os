import { WorkflowStep } from '@/core/workflows';
import { ICalendarProvider } from '@/core/providers';
import { OnboardingContext } from './GenerateKanbanStagesStep';

export class ScheduleKickoffStep implements WorkflowStep<OnboardingContext> {
  name = 'ScheduleKickoff';
  
  constructor(private calendarProvider: ICalendarProvider) {}

  async execute(context: OnboardingContext): Promise<void> {
    // Planify in 5 days
    const date = new Date();
    date.setDate(date.getDate() + 5);
    await this.calendarProvider.scheduleKickoff(context.projectId, date);
  }
}
