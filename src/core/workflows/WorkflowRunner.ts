import { WorkflowStep, WorkflowFailureReporter } from './WorkflowStep';
import { logger } from '../logger';

export interface WorkflowResult {
  workflowName: string;
  totalDurationMs: number;
  completed: string[];
  failed: { step: string; message: string }[];
}

export class WorkflowRunner<TContext> {
  constructor(
    private workflowName: string,
    private steps: WorkflowStep<TContext>[],
    private onStepFailed?: WorkflowFailureReporter<TContext>,
  ) {}

  /**
   * Exécute les étapes en séquence. Une étape qui échoue n'interrompt pas les
   * suivantes — un onboarding partiellement abouti vaut mieux qu'un onboarding
   * bloqué au premier accroc. En revanche l'échec n'est jamais avalé : il est
   * journalisé, rapporté via `onStepFailed`, et présent dans le résultat.
   */
  async execute(context: TContext): Promise<WorkflowResult> {
    logger.info(`[Workflow: ${this.workflowName}] Starting`);
    const startTime = Date.now();
    const completed: string[] = [];
    const failed: { step: string; message: string }[] = [];

    for (const step of this.steps) {
      const stepStartTime = Date.now();
      try {
        await step.execute(context);
        const duration = Date.now() - stepStartTime;
        completed.push(step.name);
        logger.info(`[Workflow: ${this.workflowName}] Step '${step.name}' completed in ${duration}ms`);
      } catch (error) {
        const durationMs = Date.now() - stepStartTime;
        const message = error instanceof Error ? error.message : String(error);
        failed.push({ step: step.name, message });
        logger.error(`[Workflow: ${this.workflowName}] Step '${step.name}' failed after ${durationMs}ms`, error);

        if (this.onStepFailed) {
          // Le reporter ne doit jamais faire tomber le workflow : s'il échoue
          // lui-même, on se contente de le journaliser.
          try {
            await this.onStepFailed({
              workflowName: this.workflowName,
              stepName: step.name,
              error,
              context,
              durationMs,
            });
          } catch (reportError) {
            logger.error(`[Workflow: ${this.workflowName}] Failure reporter threw`, reportError);
          }
        }
      }
    }

    const totalDurationMs = Date.now() - startTime;
    if (failed.length === 0) {
      logger.info(`[Workflow: ${this.workflowName}] Completed in ${totalDurationMs}ms`);
    } else {
      logger.warn(
        `[Workflow: ${this.workflowName}] Completed in ${totalDurationMs}ms with ${failed.length} failed step(s)`,
        { failed },
      );
    }

    return { workflowName: this.workflowName, totalDurationMs, completed, failed };
  }
}
