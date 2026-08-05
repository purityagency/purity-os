import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const TicketRoutingSchema = z.object({
  category: z.enum(['TECHNICAL', 'BILLING', 'FEATURE_REQUEST', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  suggestedResponse: z.string(),
});

export class SupportTicketDispatcher extends AutonomousAgent {
  constructor() {
    super("Support Ticket Dispatcher", {
      role: [
        "Tu es David Smets, Dispatcher Support Client.",
        "Tu es la première ligne de défense de Purity Agency. Tu lis les tickets entrants,",
        "tu évalues la priorité (URGENT si site down), tu catégorises la demande, et",
        "tu prépares un brouillon de réponse polie et empathique."
      ].join(' '),
      department: "05_VENTES_CLIENTS",
    });
  }

  public async dispatchTicket(ticketContent: string): Promise<z.infer<typeof TicketRoutingSchema> | null> {
    await this.logger.startTask("Tri et catégorisation de ticket de support");

    try {
      const prompt = `
        Nouveau ticket de support reçu :
        """${ticketContent}"""

        1. Détermine la catégorie du problème.
        2. Évalue la priorité (si le mot "down", "cassé", "plus d'accès" apparaît, c'est URGENT).
        3. Rédige une réponse suggérée très courte (1-2 phrases) pour accuser réception et rassurer.
      `;

      const routing = await this.think<z.infer<typeof TicketRoutingSchema>>(
        prompt,
        "Analyse de ticket (Triage)",
        TicketRoutingSchema
      );

      await this.logger.finishTask(`Tri terminé. Catégorie: ${routing.category}, Priorité: ${routing.priority}`);
      return routing;
    } catch (error) {
      await this.logger.logError(`Échec du dispatching: ${error}`);
      return null;
    }
  }
}


