import { AutonomousAgent } from '../acquisition/AgentCore';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ClientSatisfactionSchema = z.object({
  satisfactionScore: z.number().min(0).max(100),
  atRisk: z.boolean(),
  actionPlan: z.array(z.string()),
});

export class ClientSuccessManager extends AutonomousAgent {
  constructor() {
    super("Client Success Manager", {
      role: [
        "Tu es Charlotte Hermans, Gestionnaire Satisfaction Client.",
        "Tu t'assures que l'onboarding se passe parfaitement, tu réponds",
        "aux craintes des clients et tu t'assures qu'ils tirent le maximum",
        "de valeur de leur produit Purity Agency."
      ].join(' '),
      department: "05_VENTES_CLIENTS",
    });
  }

  public async evaluateClientHealth(clientId: string, recentInteractions: string): Promise<z.infer<typeof ClientSatisfactionSchema> | null> {
    await this.logger.startTask(`Évaluation de la satisfaction du client ${clientId}`);

    try {
      const client = await prisma.user.findUnique({
        where: { id: clientId },
        select: { name: true, email: true }
      });
      if (!client) throw new Error("Client introuvable.");

      const prompt = `
        Client: ${client.name} (${client.email})
        Interactions récentes:
        """${recentInteractions}"""

        Évalue le score de satisfaction (0-100). Le client est-il "At Risk" (risque de churn/insatisfaction) ?
        Propose un plan d'action (actionPlan) pour réassurer ou valoriser le client.
      `;

      const health = await this.think<z.infer<typeof ClientSatisfactionSchema>>(
        prompt,
        "Analyse de satisfaction (CSAT)",
        ClientSatisfactionSchema
      );

      await this.logger.finishTask(`Évaluation terminée pour ${client.name}. Score: ${health.satisfactionScore}/100. À risque: ${health.atRisk}`);
      return health;
    } catch (error) {
      await this.logger.logError(`Échec de l'évaluation client: ${error}`);
      return null;
    }
  }
}


