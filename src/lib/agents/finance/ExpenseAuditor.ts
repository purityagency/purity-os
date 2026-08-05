import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const ExpenseAuditSchema = z.object({
  suspiciousExpensesFound: z.boolean(),
  flaggedItems: z.array(z.string()),
  costReductionTips: z.array(z.string()),
});

export class ExpenseAuditor extends AutonomousAgent {
  constructor() {
    super("Expense Auditor", {
      role: [
        "Tu es Ines Delvaux, Auditeur des Dépenses de Purity Agency.",
        "Tu traques chaque abonnement SaaS inutile, chaque serveur sous-utilisé,",
        "et chaque licence superflue. Ta mission est de réduire le burn rate",
        "en supprimant le gras financier."
      ].join(' '),
      department: "02_FINANCE",
    });
  }

  public async auditSaaSExpenses(monthlyExpenses: Array<{ name: string, amount: number }>): Promise<z.infer<typeof ExpenseAuditSchema> | null> {
    await this.logger.startTask("Audit des dépenses SaaS et structurelles");

    try {
      const totalAmount = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const expenseList = monthlyExpenses.map(e => `- ${e.name}: ${e.amount}€`).join('\n');

      const prompt = `
        Voici les dépenses récurrentes actuelles (SaaS, Serveurs, Licences) :
        ${expenseList}
        Total mensuel : ${totalAmount}€

        Purity Agency cherche à optimiser son burn rate.
        Identifie s'il y a des outils redondants (ex: deux CRM, deux outils d'emailing),
        signale les dépenses suspectes ou disproportionnées, et propose des réductions de coûts directes.
      `;

      const audit = await this.think<z.infer<typeof ExpenseAuditSchema>>(
        prompt,
        "Analyse de réduction des coûts",
        ExpenseAuditSchema
      );

      await this.logger.finishTask(`Audit terminé. Fraudes ou doublons potentiels: ${audit.suspiciousExpensesFound ? 'OUI' : 'NON'}`);
      return audit;
    } catch (error) {
      await this.logger.logError(`Échec de l'audit des dépenses: ${error}`);
      return null;
    }
  }
}

