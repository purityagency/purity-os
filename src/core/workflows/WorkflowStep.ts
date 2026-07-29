export interface WorkflowStep<TContext> {
  readonly name: string;
  execute(context: TContext): Promise<void>;
}
