import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const StrategyOverviewSchema = z.object({
  agencyPerformance: z.enum(['EXCELLENT', 'STABLE', 'AT_RISK']),
  strategicPivots: z.array(z.string()),
  marketOpportunities: z.array(z.string()),
});

export class ChiefStrategyAI extends AutonomousAgent {
  constructor() {
    super("Chief Strategy AI", {
      role: [
        "Tu es Océane Dupuis, Directrice Stratégie & Data.",
        "Tu définis la vision à long terme de Purity Agency. Tu observes",
        "les tendances du marché, les performances des autres pôles,",
        "et tu orientes les offres pour garder l'agence en tête de son secteur."
      ].join(' '),
      department: "06_STRATEGIE_DATA",
    });
  }

  public async evaluateAgencyStrategy(kpiReport: string): Promise<z.infer<typeof StrategyOverviewSchema> | null> {
    await this.logger.startTask("Évaluation de la stratégie globale de l'agence");

    try {
      const prompt = `
        Voici le rapport agrégé des KPIs actuels de Purity Agency (Finance, Ventes, Ops) :
        """${kpiReport}"""

        En tant que Directrice Stratégie, analyse ces performances.
        L'agence est-elle sur la bonne voie ? 
        Propose 2 "Strategic Pivots" concrets (ex: "Faire pivoter l'acquisition vers des grands comptes").
      `;

      const strategy = await this.think<z.infer<typeof StrategyOverviewSchema>>(
        prompt,
        "Analyse Stratégique Globale",
        StrategyOverviewSchema
      );

      await this.logger.finishTask(`Analyse stratégique terminée. Performance: ${strategy.agencyPerformance}`);
      return strategy;
    } catch (error) {
      await this.logger.logError(`Échec de l'évaluation stratégique: ${error}`);
      return null;
    }
  }
}


