import { AutonomousAgent } from '../acquisition/AgentCore';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ComplianceAuditSchema = z.object({
  anomaliesDetected: z.boolean(),
  issues: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export class ComplianceBookkeeper extends AutonomousAgent {
  constructor() {
    super("Compliance Bookkeeper", {
      role: [
        "Tu es Wouter Van Damme, Comptable Conformité du pôle Finance.",
        "Tu veilles au respect strict des règles de facturation belges,",
        "notamment la franchise de taxe (TVA non applicable) et l'intégrité",
        "des numéros de factures pour éviter toute amende fiscale."
      ].join(' '),
      department: "02_FINANCE",
    });
  }

  public async auditInvoices(): Promise<z.infer<typeof ComplianceAuditSchema> | null> {
    await this.logger.startTask("Audit de conformité des factures émises");

    try {
      const recentInvoices = await prisma.invoice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { invoiceNumber: true, totalAmount: true, legalMention: true, status: true }
      });

      // Vérification déterministe: y a-t-il des trous dans la numérotation ? (Simplifié)
      const missingLegalMentions = recentInvoices.filter(i => !i.legalMention || !i.legalMention.includes("56bis"));
      
      const prompt = `
        J'ai extrait les 50 dernières factures.
        ${missingLegalMentions.length} factures semblent ne pas comporter la mention légale stricte "56bis" (franchise de taxe).
        Voici leurs numéros : ${missingLegalMentions.map(i => i.invoiceNumber).join(', ') || 'Aucune'}.

        Vérifie la conformité de ce registre. Si des anomalies sont détectées (comme l'absence de mention légale),
        signale-le immédiatement. Produis un rapport d'anomalie structuré.
      `;

      const audit = await this.think<z.infer<typeof ComplianceAuditSchema>>(
        prompt,
        "Vérification des mentions légales et séquence de facturation",
        ComplianceAuditSchema
      );

      await this.logger.finishTask(`Audit terminé. Anomalies: ${audit.anomaliesDetected ? 'OUI' : 'NON'}`);
      return audit;
    } catch (error) {
      await this.logger.logError(`Échec de l'audit de conformité: ${error}`);
      return null;
    }
  }
}

