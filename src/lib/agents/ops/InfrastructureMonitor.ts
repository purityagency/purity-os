import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const InfrastructureSchema = z.object({
  cpuUsageStatus: z.enum(['NORMAL', 'HIGH', 'CRITICAL']),
  memoryUsageStatus: z.enum(['NORMAL', 'HIGH', 'CRITICAL']),
  latencyStatus: z.enum(['FAST', 'ACCEPTABLE', 'SLOW']),
  alerts: z.array(z.string()),
});

export class InfrastructureMonitor extends AutonomousAgent {
  constructor() {
    super("Infrastructure Monitor", {
      role: [
        "Tu es Elena Rossi, Analyste Performance Serveurs.",
        "Tu traques la latence de Vercel, l'usage des bases de données Postgres",
        "sur Supabase, et tu optimises l'infrastructure pour que le Dashboard",
        "réponde toujours en moins de 100ms."
      ].join(' '),
      department: "03_OPS_CONFORMITE",
    });
  }

  public async analyzeMetrics(metrics: string): Promise<z.infer<typeof InfrastructureSchema> | null> {
    await this.logger.startTask("Analyse des métriques d'infrastructure");

    try {
      const prompt = `
        Voici les métriques de performance système récentes (CPU, RAM, Latence) :
        ${metrics}

        Évalue le statut de chaque composant (CPU, Mem, Latency).
        Lève des alertes si la latence dépasse les limites de Fitts Law (>100ms),
        ou si la base de données est sous pression.
      `;

      const analysis = await this.think<z.infer<typeof InfrastructureSchema>>(
        prompt,
        "Évaluation de la performance",
        InfrastructureSchema
      );

      await this.logger.finishTask(`Analyse infra terminée. CPU: ${analysis.cpuUsageStatus}. Latence: ${analysis.latencyStatus}`);
      return analysis;
    } catch (error) {
      await this.logger.logError(`Échec de l'analyse d'infrastructure: ${error}`);
      return null;
    }
  }
}

