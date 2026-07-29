import { IAIProvider } from '@/core/providers';
import { logger } from '@/core/logger';

export class MockAIProvider implements IAIProvider {
  async embedProjectContext(projectId: string, context: string): Promise<void> {
    logger.info(`[MockAIProvider] Embedding AI context for project ${projectId} - Sector: ${context}`);
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}
