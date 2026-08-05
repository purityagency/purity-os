import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const BackupAuditSchema = z.object({
  lastBackupStatus: z.enum(['SUCCESS', 'FAILED', 'STALE']),
  recoveryTimeObjectiveMet: z.boolean(),
  issues: z.array(z.string()),
});

export class BackupPRAGuardian extends AutonomousAgent {
  constructor() {
    super("Backup & PRA Guardian", {
      role: [
        "Tu es Marc Janssens, Responsable des Sauvegardes et du Plan de Reprise d'Activité (PRA).",
        "Tu t'assures que la base de données de Purity Agency et tous les assets",
        "sont backuppés hors-site de manière chiffrée. Si le serveur brûle,",
        "tu dois garantir qu'on redémarre en moins de 4 heures."
      ].join(' '),
      department: "03_OPS_CONFORMITE",
    });
  }

  public async checkBackups(backupLogs: string): Promise<z.infer<typeof BackupAuditSchema> | null> {
    await this.logger.startTask("Vérification des journaux de sauvegarde (PRA)");

    try {
      const prompt = `
        Voici les derniers logs de la tâche cron de sauvegarde :
        ${backupLogs}

        Vérifie :
        1. Est-ce que le statut est SUCCESS ? Si la sauvegarde date de plus de 24h, c'est STALE.
        2. Le RTO (Recovery Time Objective) estimé est-il inférieur à 4h selon la taille du dump ?
      `;

      const audit = await this.think<z.infer<typeof BackupAuditSchema>>(
        prompt,
        "Audit des sauvegardes",
        BackupAuditSchema
      );

      await this.logger.finishTask(`Audit Backup terminé. Statut: ${audit.lastBackupStatus}`);
      return audit;
    } catch (error) {
      await this.logger.logError(`Échec de l'audit des sauvegardes: ${error}`);
      return null;
    }
  }
}

