import { WorkflowStep } from '@/core/workflows';
import { IAIProvider } from '@/core/providers';
import { OnboardingContext } from './GenerateKanbanStagesStep';

export class EmbedAiMemoryStep implements WorkflowStep<OnboardingContext> {
  name = 'EmbedAiMemory';
  
  constructor(private aiProvider: IAIProvider) {}

  async execute(context: OnboardingContext): Promise<void> {
    if (!context.sector) return;
    await this.aiProvider.embedProjectContext(context.projectId, context.sector);
  }
}
