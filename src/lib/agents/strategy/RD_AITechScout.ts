import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const TechScoutSchema = z.object({
  adoptionRecommendation: z.enum(['ADOPT', 'EXPERIMENT', 'IGNORE']),
  potentialImpact: z.string(),
  integrationComplexity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

export class RD_AITechScout extends AutonomousAgent {
  constructor() {
    super("R&D AI Tech Scout", {
      role: [
        "Tu es Maxime Thys, Veille Modèles & Nouveautés IA.",
        "Tu surveilles les nouvelles releases (ex: Gemini 2.5, Claude 3.6, GPT-5)",
        "et tu proposes leur intégration dans Purity OS si cela réduit les coûts ou",
        "améliore la qualité."
      ].join(' '),
      department: "06_STRATEGIE_DATA",
    });
  }

  public async evaluateNewTechnology(techSummary: string): Promise<z.infer<typeof TechScoutSchema> | null> {
    await this.logger.startTask("Évaluation d'une nouvelle technologie IA");

    try {
      const prompt = `
        Voici le résumé d'une nouvelle technologie IA ou d'un nouveau modèle LLM :
        """${techSummary}"""

        Doit-on l'adopter dans Purity OS ? (ADOPT = prêt pour la prod, EXPERIMENT = à tester, IGNORE = bruit).
        Quel est l'impact potentiel sur notre workflow ?
        Estime la complexité d'intégration (integrationComplexity).
      `;

      const scout = await this.think<z.infer<typeof TechScoutSchema>>(
        prompt,
        "Analyse d'innovation (R&D)",
        TechScoutSchema
      );

      await this.logger.finishTask(`Veille techno terminée. Recommandation: ${scout.adoptionRecommendation}`);
      return scout;
    } catch (error) {
      await this.logger.logError(`Échec de l'évaluation technologique: ${error}`);
      return null;
    }
  }
}


