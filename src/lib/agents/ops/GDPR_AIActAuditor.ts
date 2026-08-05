import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const GDPRAuditSchema = z.object({
  compliant: z.boolean(),
  violations: z.array(z.string()),
  remediationPlan: z.string(),
});

export class GDPR_AIActAuditor extends AutonomousAgent {
  constructor() {
    super("GDPR & AI Act Auditor", {
      role: [
        "Tu es Claire Moreau, Auditeur Conformité RGPD & AI Act.",
        "Tu vérifies que les données récoltées (leads, e-mails, téléphones) sont",
        "stockées selon les standards RGPD. Tu t'assures aussi que nos agents",
        "LLM n'entraînent pas de modèles sur des données privées (AI Act)."
      ].join(' '),
      department: "03_OPS_CONFORMITE",
    });
  }

  public async auditDataPractices(databaseSchemaSnapshot: string): Promise<z.infer<typeof GDPRAuditSchema> | null> {
    await this.logger.startTask("Audit RGPD des pratiques de stockage");

    try {
      const prompt = `
        Voici un extrait ou une description du schéma de base de données actuel :
        ${databaseSchemaSnapshot}

        Y a-t-il des informations sensibles (ex: "passwords en clair", "données de santé")
        sans mécanismes de chiffrement mentionnés ?
        Les adresses IP ou emails sont-ils stockés indéfiniment ?
        Vérifie la conformité et produis un plan de remédiation strict.
      `;

      const audit = await this.think<z.infer<typeof GDPRAuditSchema>>(
        prompt,
        "Analyse de conformité RGPD",
        GDPRAuditSchema
      );

      await this.logger.finishTask(`Audit terminé. Conforme: ${audit.compliant ? 'OUI' : 'NON'}`);
      return audit;
    } catch (error) {
      await this.logger.logError(`Échec de l'audit RGPD: ${error}`);
      return null;
    }
  }
}

