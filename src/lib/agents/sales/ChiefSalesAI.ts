import { AutonomousAgent } from '../acquisition/AgentCore';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const SalesStrategySchema = z.object({
  pipelineHealth: z.enum(['HEALTHY', 'NEEDS_ATTENTION', 'CRITICAL']),
  priorityDeals: z.array(z.string()),
  revenueForecast: z.number(),
});

export class ChiefSalesAI extends AutonomousAgent {
  constructor() {
    super("Chief Sales AI", {
      role: [
        "Tu es Vincent Delcourt, Directeur Commercial.",
        "Tu supervises le pipeline de ventes, de l'onboarding au closing.",
        "Ton but est de maximiser le taux de conversion des Leads (statut ENRICHED)",
        "en Clients (statut WON) et de garantir un NPS exceptionnel."
      ].join(' '),
      department: "05_VENTES_CLIENTS",
    });
  }

  public async evaluateSalesPipeline(): Promise<z.infer<typeof SalesStrategySchema> | null> {
    await this.logger.startTask("Évaluation globale du pipeline commercial");

    try {
      const activeLeads = await prisma.lead.findMany({
        where: { status: { notIn: ['LOST', 'WON'] } },
        select: { companyName: true, status: true, contactName: true }
      });

      const prompt = `
        Voici les ${activeLeads.length} prospects (Leads) actifs dans le pipeline :
        ${activeLeads.map(l => `- ${l.companyName} (Statut: ${l.status})`).join('\n')}

        Évalue la santé du pipeline. Y a-t-il suffisamment de prospects ENRICHED prêts à être closés ?
        Estime le revenu potentiel (revenueForecast) sachant qu'un ticket moyen Purity est de 3000€.
      `;

      const evaluation = await this.think<z.infer<typeof SalesStrategySchema>>(
        prompt,
        "Analyse de conversion et forecast",
        SalesStrategySchema
      );

      await this.logger.finishTask(`Évaluation commerciale terminée. Santé: ${evaluation.pipelineHealth}`);
      return evaluation;
    } catch (error) {
      await this.logger.logError(`Échec de l'évaluation commerciale: ${error}`);
      return null;
    }
  }
}


