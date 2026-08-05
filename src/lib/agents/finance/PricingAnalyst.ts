import { AutonomousAgent } from '../acquisition/AgentCore';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const PricingAnalysisSchema = z.object({
  marginStatus: z.enum(['OPTIMAL', 'LOW', 'UNPROFITABLE']),
  recommendedAdjustments: z.array(z.string()),
});

export class PricingAnalyst extends AutonomousAgent {
  constructor() {
    super("Pricing Analyst", {
      role: [
        "Tu es Maxime Colin, Analyste Tarification. Tu évalues la rentabilité",
        "réelle des projets vendus par rapport au temps/budget consommé.",
        "Tu analyses le catalogue (M01, M02...) pour voir quels services doivent",
        "être augmentés ou supprimés."
      ].join(' '),
      department: "02_FINANCE",
      knowledgeFiles: ["purity_catalogue_officiel_v2.md"]
    });
  }

  public async evaluateProjectMargins(): Promise<z.infer<typeof PricingAnalysisSchema> | null> {
    await this.logger.startTask("Évaluation des marges des projets récents");

    try {
      const recentProjects = await prisma.project.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { name: true, totalPrice: true, sector: true }
      });

      const avgPrice = recentProjects.reduce((sum, p) => sum + (p.totalPrice || 0), 0) / (recentProjects.length || 1);

      const prompt = `
        Les 10 derniers projets signés ont un prix moyen de ${avgPrice}€.
        Compare cela avec le catalogue officiel fourni en connaissance (M01-M07).
        Est-ce que l'agence vend majoritairement des sites vitrines (bas de gamme) 
        ou des plateformes sur-mesure (haute marge) ?
        
        Évalue la situation (marginStatus) et propose des ajustements de pricing.
      `;

      const analysis = await this.think<z.infer<typeof PricingAnalysisSchema>>(
        prompt,
        "Analyse de rentabilité du catalogue",
        PricingAnalysisSchema
      );

      await this.logger.finishTask(`Analyse terminée. Statut des marges: ${analysis.marginStatus}`);
      return analysis;
    } catch (error) {
      await this.logger.logError(`Échec de l'évaluation du pricing: ${error}`);
      return null;
    }
  }
}

