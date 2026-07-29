import { IStorageProvider } from '@/core/providers';
import { logger } from '@/core/logger';

export class MockStorageProvider implements IStorageProvider {
  async createProjectPrefix(projectId: string): Promise<void> {
    logger.info(`[MockStorageProvider] Creating S3 prefix for project ${projectId}`);
    await new Promise(resolve => setTimeout(resolve, 100)); // simulate latency
  }
}
