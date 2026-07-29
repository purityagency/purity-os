import { WorkflowStep } from '@/core/workflows';
import { IStorageProvider } from '@/core/providers';
import { OnboardingContext } from './GenerateKanbanStagesStep';

export class CreateStoragePrefixStep implements WorkflowStep<OnboardingContext> {
  name = 'CreateStoragePrefix';
  
  constructor(private storageProvider: IStorageProvider) {}

  async execute(context: OnboardingContext): Promise<void> {
    await this.storageProvider.createProjectPrefix(context.projectId);
  }
}
