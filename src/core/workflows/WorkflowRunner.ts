import { WorkflowStep } from './WorkflowStep';
import { logger } from '../logger';

export class WorkflowRunner<TContext> {
  constructor(private workflowName: string, private steps: WorkflowStep<TContext>[]) {}

  async execute(context: TContext): Promise<void> {
    logger.info(`[Workflow: ${this.workflowName}] Starting`);
    const startTime = Date.now();

    for (const step of this.steps) {
      const stepStartTime = Date.now();
      try {
        await step.execute(context);
        const duration = Date.now() - stepStartTime;
        logger.info(`[Workflow: ${this.workflowName}] Step '${step.name}' completed in ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - stepStartTime;
        logger.error(`[Workflow: ${this.workflowName}] Step '${step.name}' failed after ${duration}ms`, error);
        // We do not rethrow, allowing the workflow to continue despite a step failure.
      }
    }

    const totalDuration = Date.now() - startTime;
    logger.info(`[Workflow: ${this.workflowName}] Completed in ${totalDuration}ms`);
  }
}
