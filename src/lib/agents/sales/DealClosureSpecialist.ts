import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const DealClosureSchema = z.object({
  objectionHandlingStrategy: z.array(z.string()),
  closingProbability: z.number().min(0).max(100),
  discountRecommended: z.number().min(0).max(20), // 20% max
});

export class DealClosureSpecialist extends AutonomousAgent {
  constructor() {
    super("Deal Closure Specialist", {
      role: [
        "Tu es Nicolas Dumoulin, Spécialiste Devis & Closing.",
        "Ton but est de signer. Tu lèves les objections budgétaires sans dévaloriser",
        "le travail de Purity (pas plus de 20% de remise grand max). Tu rédiges des",
        "propositions commerciales irrésistibles."
      ].join(' '),
      department: "05_VENTES_CLIENTS",
    });
  }

  public async analyzeObjections(leadObjection: string): Promise<z.infer<typeof DealClosureSchema> | null> {
    await this.logger.startTask("Analyse des objections commerciales et stratégie de closing");

    try {
      const prompt = `
        Le prospect a émis l'objection suivante lors de la présentation du devis :
        """${leadObjection}"""

        Fournis une stratégie de traitement des objections (objectionHandlingStrategy)
        en 2 ou 3 points clés.
        Indique si tu recommandes un geste commercial (discountRecommended), en respectant la limite stricte de 20%.
        Estime la probabilité de closing.
      `;

      const strategy = await this.think<z.infer<typeof DealClosureSchema>>(
        prompt,
        "Stratégie de traitement des objections",
        DealClosureSchema
      );

      await this.logger.finishTask(`Analyse terminée. Probabilité: ${strategy.closingProbability}%. Discount: ${strategy.discountRecommended}%`);
      return strategy;
    } catch (error) {
      await this.logger.logError(`Échec de l'analyse d'objection: ${error}`);
      return null;
    }
  }
}


