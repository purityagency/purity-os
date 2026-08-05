import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const AccessAuditSchema = z.object({
  unauthorizedAccessAttempts: z.number(),
  vulnerableAccounts: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export class AccessSecurityOfficer extends AutonomousAgent {
  constructor() {
    super("Access & Security Officer", {
      role: [
        "Tu es Lucas Bernard, Gestionnaire Clés & Accès.",
        "Tu surveilles les accès à Purity OS (tentatives de connexion),",
        "tu gères la rotation des clés (Stripe, Vercel, Gemini), et",
        "tu t'assures que l'authentification 2FA est activée."
      ].join(' '),
      department: "03_OPS_CONFORMITE",
    });
  }

  public async auditAccessLogs(authLogs: string[]): Promise<z.infer<typeof AccessAuditSchema> | null> {
    await this.logger.startTask("Audit des logs d'authentification");

    try {
      const prompt = `
        Voici les récentes tentatives d'authentification sur Purity OS :
        ${authLogs.join('\n')}

        Y a-t-il des comptes qui n'utilisent pas le MFA/2FA ?
        Y a-t-il eu de multiples échecs de connexion (bruteforce) ?
        Détaille les vulnérabilités.
      `;

      const audit = await this.think<z.infer<typeof AccessAuditSchema>>(
        prompt,
        "Analyse de sécurité des accès",
        AccessAuditSchema
      );

      await this.logger.finishTask(`Audit d'accès terminé. Tentatives suspectes: ${audit.unauthorizedAccessAttempts}`);
      return audit;
    } catch (error) {
      await this.logger.logError(`Échec de l'audit d'accès: ${error}`);
      return null;
    }
  }
}

