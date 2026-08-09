import { IAIProvider } from '@/core/providers';
import { logger } from '@/core/logger';
import { prisma } from '@/lib/prisma';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

/**
 * Mémoire IA d'onboarding — remplace l'ancien "OpenAIProvider" (qui cherchait
 * une clé OPENAI/GOOGLE_GENERATIVE_AI inexistante et jetait son résultat).
 * Ici : on utilise la clé Gemini réellement présente (GEMINI_API_KEY, comme
 * tous les agents), on génère une note de contexte projet, et surtout on la
 * PERSISTE (Event lié au projet) — sinon l'appel LLM ne sert à rien.
 */
export class GeminiMemoryProvider implements IAIProvider {
  async embedProjectContext(projectId: string, context: string): Promise<void> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Nice-to-have : on ne fait pas échouer tout l'onboarding client pour ça.
      logger.warn(`[Memory] GEMINI_API_KEY absente — mémoire projet ${projectId} ignorée.`);
      return;
    }

    try {
      const google = createGoogleGenerativeAI({ apiKey });
      const { text } = await generateText({
        model: google('gemini-2.5-flash'),
        prompt:
          `Résume en 3-4 puces le contexte métier et les priorités digitales probables ` +
          `d'un client du secteur « ${context} » pour une agence web wallonne. Concis, actionnable.`,
      });

      await prisma.event.create({
        data: {
          type: 'AI',
          name: 'Mémoire IA (Onboarding)',
          summary: `Contexte projet établi — secteur ${context}`.slice(0, 200),
          projectId,
          payload: { projectId, sector: context, memory: text },
        },
      });
      logger.info(`[Memory] Contexte IA persisté pour le projet ${projectId}`);
    } catch (e) {
      logger.error(`[Memory] Échec génération contexte projet ${projectId}`, e);
      // Non bloquant : l'onboarding continue même si la note de contexte échoue.
    }
  }
}
