import { AutonomousAgent } from '../acquisition/AgentCore';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const SubscriptionSchema = z.object({
  activeSubscriptions: z.number(),
  churnRisk: z.number(), // 0 to 100
  recommendations: z.array(z.string()),
});

export class SubscriptionLifecycleAgent extends AutonomousAgent {
  constructor() {
    super("Subscription Lifecycle Agent", {
      role: [
        "Tu es Loïc Fontaine, Gestionnaire du Cycle de Vie des Abonnements.",
        "Tu surveilles les contrats de maintenance, les hébergements et",
        "les licences récurrentes. Ton objectif est de prédire le churn et de",
        "t'assurer qu'aucun renouvellement n'est oublié."
      ].join(' '),
      department: "02_FINANCE",
    });
  }

  public async evaluateSubscriptions(): Promise<z.infer<typeof SubscriptionSchema> | null> {
    await this.logger.startTask("Évaluation des abonnements et des risques d'attrition");

    try {
      // Pour Purity Agency, les abonnements sont souvent modélisés comme des projets avec des phases récurrentes
      // Ou des Leads marqués "MAINTENANCE"
      const maintenanceProjects = await prisma.project.findMany({
        where: { name: { contains: 'Maintenance', mode: 'insensitive' } },
        select: { id: true, name: true, status: true, createdAt: true }
      });

      const prompt = `
        Purity Agency possède actuellement ${maintenanceProjects.length} contrats actifs identifiés
        comme "Maintenance".
        Vérifie la répartition de ces contrats et évalue le risque d'attrition (Churn Risk)
        basé sur la rétention habituelle d'une agence digitale.
        Formule 2 recommandations pour garantir le renouvellement de ces contrats.
      `;

      const analysis = await this.think<z.infer<typeof SubscriptionSchema>>(
        prompt,
        "Analyse de rétention",
        SubscriptionSchema
      );

      await this.logger.finishTask(`Analyse terminée. Contrats: ${analysis.activeSubscriptions}. Churn Risk: ${analysis.churnRisk}%`);
      return analysis;
    } catch (error) {
      await this.logger.logError(`Échec de l'évaluation des abonnements: ${error}`);
      return null;
    }
  }
}

