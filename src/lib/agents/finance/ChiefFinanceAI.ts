import { AutonomousAgent } from '../acquisition/AgentCore';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const FinanceReportSchema = z.object({
  overallHealth: z.enum(['EXCELLENT', 'GOOD', 'WARNING', 'CRITICAL']),
  cashflowInsights: z.array(z.string()),
  recommendedActions: z.array(z.string()),
});

type FinanceReport = z.infer<typeof FinanceReportSchema>;

export class ChiefFinanceAI extends AutonomousAgent {
  constructor() {
    super("Chief Finance AI", {
      role: [
        "Tu es Nathalie Coppens, Directrice Finance du pôle Finance & Administration de",
        "Purity Agency. Tu supervises la trésorerie, la rentabilité des projets, et",
        "l'ensemble de la stratégie financière. Tu es intraitable sur les marges",
        "et la sécurité financière de l'agence (Fonds propres, TVA, Cashflow)."
      ].join(' '),
      department: "02_FINANCE",
    });
  }

  /**
   * Analyse la situation financière globale en se basant sur les projets
   * et les factures réelles de la base de données.
   */
  public async generateFinanceReport(): Promise<FinanceReport | null> {
    await this.logger.startTask("Génération du rapport financier global");

    try {
      // 1. Récupération des données réelles
      const projects = await prisma.project.findMany({
        where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
        select: { id: true, name: true, totalPrice: true, remainingAmount: true }
      });

      const invoices = await prisma.invoice.findMany({
        where: { status: { in: ['PAID', 'PENDING', 'OVERDUE'] } },
        select: { id: true, totalAmount: true, status: true }
      });

      // 2. Agrégation déterministe
      const totalExpected = projects.reduce((acc, p) => acc + (p.totalPrice || 0), 0);
      const totalRemaining = projects.reduce((acc, p) => acc + (p.remainingAmount || 0), 0);
      
      const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
      const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((acc, inv) => acc + inv.totalAmount, 0);
      const totalOverdue = invoices.filter(i => i.status === 'OVERDUE').reduce((acc, inv) => acc + inv.totalAmount, 0);

      // 3. Analyse LLM
      const prompt = `
        Voici les données financières réelles de Purity Agency extraites de la base de données :
        
        - Valeur totale des projets (actifs/terminés) : ${totalExpected}€
        - Montant restant à facturer sur les projets : ${totalRemaining}€
        - Total facturé (Toutes factures confondues) : ${totalInvoiced}€
        - Total payé / encaissé : ${totalPaid}€
        - Total en retard (OVERDUE) : ${totalOverdue}€

        Analyse ces chiffres et fournis un rapport structuré sur la santé financière de l'agence.
        - overallHealth: L'état global de la trésorerie.
        - cashflowInsights: 2 à 3 points clés sur l'équilibre financier actuel.
        - recommendedActions: Actions immédiates à prendre (ex: relance des impayés, focus sur les acomptes).
      `;

      const report = await this.think<FinanceReport>(
        prompt,
        "Analyse de rentabilité et cashflow",
        FinanceReportSchema
      );

      await this.logger.finishTask(`Rapport généré: Santé ${report.overallHealth}`);
      return report;
    } catch (error) {
      await this.logger.logError(`Échec de la génération du rapport financier: ${error}`);
      return null;
    }
  }
}

