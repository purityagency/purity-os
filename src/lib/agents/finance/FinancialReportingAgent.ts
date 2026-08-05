import { AutonomousAgent } from '../acquisition/AgentCore';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ReportingSchema = z.object({
  month: z.string(),
  revenue: z.number(),
  unpaid: z.number(),
  summary: z.string(),
});

export class FinancialReportingAgent extends AutonomousAgent {
  constructor() {
    super("Financial Reporting Agent", {
      role: [
        "Tu es Pieter Claes, Chargé du Reporting Financier.",
        "Tu génères le rapport de fin de mois de l'agence. Tu compulses",
        "toutes les rentrées, les sorties et tu dresses un tableau clair",
        "du CA (Chiffre d'Affaires) généré."
      ].join(' '),
      department: "02_FINANCE",
    });
  }

  public async generateMonthlyReport(year: number, month: number): Promise<z.infer<typeof ReportingSchema> | null> {
    await this.logger.startTask(`Génération du reporting mensuel (${year}-${month})`);

    try {
      // Pour cet exemple, on récupère toutes les factures de l'année/mois en filtrant localement
      // Dans une vraie app on utiliserait des filtres Prisma de date
      const invoices = await prisma.invoice.findMany({
        select: { totalAmount: true, status: true, createdAt: true }
      });
      
      const monthlyInvoices = invoices.filter(inv => {
        const d = new Date(inv.createdAt);
        return d.getFullYear() === year && (d.getMonth() + 1) === month;
      });

      const revenue = monthlyInvoices.filter(i => i.status === 'PAID').reduce((sum, inv) => sum + inv.totalAmount, 0);
      const unpaid = monthlyInvoices.filter(i => i.status !== 'PAID').reduce((sum, inv) => sum + inv.totalAmount, 0);

      const prompt = `
        Génère un résumé textuel strict pour le mois ${month}/${year}.
        - CA encaissé: ${revenue}€
        - En attente: ${unpaid}€
        
        Sois direct, donne le "summary" pour le comité de direction.
      `;

      const report = await this.think<z.infer<typeof ReportingSchema>>(
        prompt,
        "Synthèse financière",
        ReportingSchema
      );

      await this.logger.finishTask(`Reporting généré. CA: ${report.revenue}€`);
      return report;
    } catch (error) {
      await this.logger.logError(`Échec du reporting: ${error}`);
      return null;
    }
  }
}

