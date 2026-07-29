import { WorkflowRunner } from '@/core/workflows';
import { GenerateKanbanStagesStep, OnboardingContext } from '../steps/GenerateKanbanStagesStep';
import { CreateStoragePrefixStep } from '../steps/CreateStoragePrefixStep';
import { ScheduleKickoffStep } from '../steps/ScheduleKickoffStep';
import { EmbedAiMemoryStep } from '../steps/EmbedAiMemoryStep';
import { MockStorageProvider } from '../providers/MockStorageProvider';
import { MockCalendarProvider } from '../providers/MockCalendarProvider';
import { MockAIProvider } from '../providers/MockAIProvider';

export class OnboardingWorkflowService {
  async runOnboarding(projectId: string, sector: string | null): Promise<void> {
    // Setup providers (DI container would normally do this)
    const storageProvider = new MockStorageProvider();
    const calendarProvider = new MockCalendarProvider();
    const aiProvider = new MockAIProvider();

    // Assemble steps
    const steps = [
      new GenerateKanbanStagesStep(),
      new CreateStoragePrefixStep(storageProvider),
      new ScheduleKickoffStep(calendarProvider),
      new EmbedAiMemoryStep(aiProvider)
    ];

    const runner = new WorkflowRunner<OnboardingContext>('Onboarding Workflow', steps);
    
    const context: OnboardingContext = { projectId, sector };
    await runner.execute(context);
  }
}
