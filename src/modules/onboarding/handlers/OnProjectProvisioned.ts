import { ProjectProvisioned } from '../events/ProjectProvisioned';
import { OnboardingWorkflowService } from '../services/OnboardingWorkflowService';
import { logger } from '@/core/logger';

export async function onProjectProvisioned(event: ProjectProvisioned): Promise<void> {
  logger.info(`[Handler] Received ProjectProvisioned for ${event.projectId}`);
  const service = new OnboardingWorkflowService();
  await service.runOnboarding(event.projectId, event.sector);
}
