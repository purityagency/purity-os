export interface IStorageProvider {
  createProjectPrefix(projectId: string): Promise<void>;
}
