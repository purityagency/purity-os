import { WorkflowRunner } from '@/core/workflows';
import type { WorkflowFailureReporter } from '@/core/workflows';
import { GenerateKanbanStagesStep, OnboardingContext } from '../steps/GenerateKanbanStagesStep';
import { CreateStoragePrefixStep } from '../steps/CreateStoragePrefixStep';
import { ScheduleKickoffStep } from '../steps/ScheduleKickoffStep';
import { EmbedAiMemoryStep } from '../steps/EmbedAiMemoryStep';
import { S3StorageProvider } from '../providers/S3StorageProvider';
import { GoogleCalendarProvider } from '../providers/GoogleCalendarProvider';
import { OpenAIProvider } from '../providers/OpenAIProvider';
import { prisma } from '@/lib/prisma';
import { logger } from '@/core/logger';

/**
 * Rend visible dans la boîte de réception admin toute étape d'onboarding qui
 * échoue. Sans ça, un échec ne vivait que dans les logs Vercel — donc invisible
 * pour l'agence, qui croyait l'onboarding complet.
 */
const reportStepFailure: WorkflowFailureReporter<OnboardingContext> = async ({
  workflowName,
  stepName,
  error,
  context,
  durationMs,
}) => {
  const message = error instanceof Error ? error.message : String(error);
  try {
    await prisma.event.create({
      data: {
        type: 'SYSTEM',
        name: workflowName,
        summary: `Étape « ${stepName} » en échec — ${message}`.slice(0, 500),
        projectId: context.projectId,
        payload: {
          workflow: workflowName,
          step: stepName,
          message,
          durationMs,
          projectId: context.projectId,
          sector: context.sector,
          failedAt: new Date().toISOString(),
        },
      },
    });
  } catch (dbError) {
    logger.error('[Onboarding] Could not persist step failure event', dbError);
  }
};

export class OnboardingWorkflowService {
  async runOnboarding(projectId: string, sector: string | null): Promise<void> {
    // Implémentations réelles : échouent bruyamment si les clés d'API sont absentes
    // Respect de la règle "Zéro donnée fictive"
    const storageProvider = new S3StorageProvider();
    const calendarProvider = new GoogleCalendarProvider();
    const aiProvider = new OpenAIProvider();

    const steps = [
      new GenerateKanbanStagesStep(),
      new CreateStoragePrefixStep(storageProvider),
      new ScheduleKickoffStep(calendarProvider),
      new EmbedAiMemoryStep(aiProvider),
    ];

    const runner = new WorkflowRunner<OnboardingContext>(
      'Onboarding Workflow',
      steps,
      reportStepFailure,
    );

    const context: OnboardingContext = { projectId, sector };
    await runner.execute(context);
  }
}
