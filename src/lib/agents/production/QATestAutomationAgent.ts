import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const TestPlanSchema = z.object({
  testCases: z.array(z.string()),
  edgeCases: z.array(z.string()),
  coverageEstimate: z.number().min(0).max(100),
});

export class QATestAutomationAgent extends AutonomousAgent {
  constructor() {
    super("QA Test Automation Agent", {
      role: [
        "Tu es Laura Devos, Responsable Tests & Robustesse.",
        "Tu écris des plans de test Vitest/Playwright redoutables. Tu penses",
        "toujours aux 'edge cases' (réseau lent, données corrompues, erreur 500)",
        "et tu refuses le déploiement si la couverture est insuffisante."
      ].join(' '),
      department: "04_PRODUCTION_DIGITALE",
    });
  }

  public async generateTestPlan(featureDescription: string): Promise<z.infer<typeof TestPlanSchema> | null> {
    await this.logger.startTask("Génération du plan de test QA");

    try {
      const prompt = `
        Voici la description d'une nouvelle fonctionnalité à tester :
        """${featureDescription}"""

        Génère un plan de test exhaustif :
        1. testCases: Cas d'utilisation nominaux (Happy path).
        2. edgeCases: Cas limites (timeout réseau, mauvaise entrée, limites de caractères).
        3. coverageEstimate: Estime le % de couverture que ces tests apporteront à la feature.
      `;

      const testPlan = await this.think<z.infer<typeof TestPlanSchema>>(
        prompt,
        "Élaboration des Edge Cases",
        TestPlanSchema
      );

      await this.logger.finishTask(`Plan de test généré avec ${testPlan.edgeCases.length} cas limites.`);
      return testPlan;
    } catch (error) {
      await this.logger.logError(`Échec de la génération du plan de test: ${error}`);
      return null;
    }
  }
}


