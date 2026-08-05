import { AutonomousAgent } from '../acquisition/AgentCore';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CashflowAnalysisSchema = z.object({
  runwayMonths: z.number(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  observations: z.array(z.string()),
});

export class CashflowAnalyst extends AutonomousAgent {
  constructor() {
    super("Cashflow Analyst", {
      role: [
        "Tu es Aïcha Benali, Analyste Trésorerie du pôle Finance de Purity Agency.",
        "Ta mission est de surveiller les entrées et sorties de cash, d'anticiper les",
        "creux de trésorerie (runway), et de lever des alertes préventives sur les",
        "factures impayées et les dépenses à venir."
      ].join(' '),
      department: "02_FINANCE",
    });
  }

  public async analyzeCashflow(monthlyBurnRate: number): Promise<z.infer<typeof CashflowAnalysisSchema> | null> {
    await this.logger.startTask("Analyse détaillée du flux de trésorerie (Cashflow)");

    try {
      const paidInvoices = await prisma.invoice.findMany({
        where: { status: 'PAID' },
        select: { totalAmount: true }
      });
      
      const pendingInvoices = await prisma.invoice.findMany({
        where: { status: { in: ['PENDING', 'OVERDUE'] } },
        select: { totalAmount: true, status: true, createdAt: true }
      });

      const totalCashAvailable = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const totalOverdue = pendingInvoices.filter(i => i.status === 'OVERDUE').reduce((sum, inv) => sum + inv.totalAmount, 0);

      const prompt = `
        Voici les métriques de trésorerie de l'agence :
        - Cash théorique disponible (Factures payées) : ${totalCashAvailable}€
        - Dépenses mensuelles (Burn rate) estimé : ${monthlyBurnRate}€
        - Factures en attente (PENDING) : ${totalPending - totalOverdue}€
        - Factures en retard (OVERDUE) : ${totalOverdue}€

        Analyse le runway (nombre de mois de survie avec le cash actuel sans nouvelles entrées)
        et identifie le niveau de risque. Le modèle d'affaires de Purity Agency nécessite un
        fonds de roulement positif d'au moins 3 mois.
      `;

      const analysis = await this.think<z.infer<typeof CashflowAnalysisSchema>>(
        prompt,
        "Calcul du Runway et évaluation du risque",
        CashflowAnalysisSchema
      );

      await this.logger.finishTask(`Analyse terminée. Runway: ${analysis.runwayMonths} mois. Risque: ${analysis.riskLevel}`);
      return analysis;
    } catch (error) {
      await this.logger.logError(`Échec de l'analyse de trésorerie: ${error}`);
      return null;
    }
  }
}

