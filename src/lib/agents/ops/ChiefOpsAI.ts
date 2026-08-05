import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const OpsReportSchema = z.object({
  uptimeStatus: z.enum(['NORMAL', 'DEGRADED', 'OUTAGE']),
  securityRisks: z.array(z.string()),
  actionRequired: z.boolean(),
});

export class ChiefOpsAI extends AutonomousAgent {
  constructor() {
    super("Chief Ops AI", {
      role: [
        "Tu es Antoine Lefebvre, Directeur des Opérations (SecOps).",
        "Tu as une vue globale sur l'uptime des serveurs, la conformité RGPD, et la",
        "sécurité des accès. Si un problème critique survient (ex: faille ou down),",
        "tu sonnes l'alarme immédiatement."
      ].join(' '),
      department: "03_OPS_CONFORMITE",
    });
  }

  public async evaluateGlobalOps(incidents: string[]): Promise<z.infer<typeof OpsReportSchema> | null> {
    await this.logger.startTask("Évaluation globale des Opérations et de la Sécurité");

    try {
      const prompt = `
        Voici la liste des incidents opérationnels récents ou alertes remontées par l'équipe Ops :
        ${incidents.length > 0 ? incidents.join(', ') : 'Aucun incident signalé.'}

        Analyse ces données. Y a-t-il des risques de sécurité critiques ?
        Quel est le statut opérationnel global ?
      `;

      const report = await this.think<z.infer<typeof OpsReportSchema>>(
        prompt,
        "Analyse de sécurité et uptime",
        OpsReportSchema
      );

      await this.logger.finishTask(`Évaluation terminée. Statut: ${report.uptimeStatus}`);
      return report;
    } catch (error) {
      await this.logger.logError(`Échec de l'évaluation des opérations: ${error}`);
      return null;
    }
  }
}

