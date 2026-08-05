import { AutonomousAgent } from '../acquisition/AgentCore';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ReconciliationSchema = z.object({
  matchedPayments: z.number(),
  unmatchedPayments: z.array(z.string()), // ID ou descriptions
  actionRequired: z.boolean(),
});

export class PaymentReconciliationAgent extends AutonomousAgent {
  constructor() {
    super("Payment Reconciliation Agent", {
      role: [
        "Tu es Sara Michiels, Agent de Rapprochement des Paiements (Finance).",
        "Tu t'assures que chaque paiement reçu (ex: via Mollie ou virement) est",
        "correctement lié à une facture existante. Tu ne laisses jamais de l'argent",
        "sans justification comptable."
      ].join(' '),
      department: "02_FINANCE",
    });
  }

  public async reconcilePendingPayments(): Promise<z.infer<typeof ReconciliationSchema> | null> {
    await this.logger.startTask("Rapprochement des paiements orphelins");

    try {
      const pendingInvoices = await prisma.invoice.findMany({
        where: { status: 'PENDING' },
        select: { id: true, invoiceNumber: true, totalAmount: true }
      });

      // Simulation de paiements reçus depuis un Provider de paiement (ex: Mollie/Stripe)
      // Pour l'instant on lit les projets qui auraient un "depositAmount" mais dont la facture n'est pas "PAID"
      const prompt = `
        Nous avons ${pendingInvoices.length} factures en attente de paiement dans le système.
        Total attendu: ${pendingInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)}€.

        Évalue la situation et propose une stratégie de rapprochement ou de relance.
        Si ce volume est anormalement élevé, signale "actionRequired: true".
      `;

      const reconciliation = await this.think<z.infer<typeof ReconciliationSchema>>(
        prompt,
        "Analyse du registre de rapprochement",
        ReconciliationSchema
      );

      await this.logger.finishTask(`Rapprochement terminé. Actions requises: ${reconciliation.actionRequired}`);
      return reconciliation;
    } catch (error) {
      await this.logger.logError(`Échec du rapprochement: ${error}`);
      return null;
    }
  }
}

