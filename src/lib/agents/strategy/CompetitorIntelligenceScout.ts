import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const CompetitorReportSchema = z.object({
  threatLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  competitorStrengths: z.array(z.string()),
  purityCounterStrategy: z.array(z.string()),
});

export class CompetitorIntelligenceScout extends AutonomousAgent {
  constructor() {
    super("Competitor Intelligence Scout", {
      role: [
        "Tu es Pauline Maes, Veille Concurrentielle Wallonie.",
        "Tu analyses les autres agences digitales concurrentes (leurs prix, leur stack,",
        "leur positionnement) et tu aides Purity Agency à garder une longueur d'avance."
      ].join(' '),
      department: "06_STRATEGIE_DATA",
    });
  }

  public async analyzeCompetitor(competitorUrl: string, rawHtmlSnippet: string): Promise<z.infer<typeof CompetitorReportSchema> | null> {
    await this.logger.startTask(`Analyse concurrentielle de ${competitorUrl}`);

    try {
      const prompt = `
        Nous étudions un concurrent via l'extrait de leur site web suivant :
        """${rawHtmlSnippet}"""

        Évalue le niveau de menace (threatLevel).
        Quelles sont leurs forces apparentes ?
        Propose une "Counter Strategy" pour que Purity Agency (avec son positionnement premium) 
        puisse gagner des parts de marché face à eux.
      `;

      const report = await this.think<z.infer<typeof CompetitorReportSchema>>(
        prompt,
        "Audit concurrentiel",
        CompetitorReportSchema
      );

      await this.logger.finishTask(`Veille concurrentielle terminée. Niveau de menace: ${report.threatLevel}`);
      return report;
    } catch (error) {
      await this.logger.logError(`Échec de l'analyse du concurrent: ${error}`);
      return null;
    }
  }
}


