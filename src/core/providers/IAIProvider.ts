export interface IAIProvider {
  embedProjectContext(projectId: string, context: string): Promise<void>;
}
