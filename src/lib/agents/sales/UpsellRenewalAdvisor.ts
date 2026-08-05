import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const UpsellSchema = z.object({
  upsellOpportunityFound: z.boolean(),
  recommendedModules: z.array(z.string()),
  reasoning: z.string(),
});

export class UpsellRenewalAdvisor extends AutonomousAgent {
  constructor() {
    super("Upsell & Renewal Advisor", {
      role: [
        "Tu es Valérie Coenen, Conseillère Renouvellements & Upsell.",
        "Ton but est d'augmenter la LTV (Life Time Value) des clients existants.",
        "Tu analyses les besoins des clients qui utilisent Purity depuis un moment",
        "pour leur suggérer de nouveaux modules (ex: M07 SEO, M05 Dashboard) pertinents."
      ].join(' '),
      department: "05_VENTES_CLIENTS",
      knowledgeFiles: ["purity_catalogue_officiel_v2.md"]
    });
  }

  public async evaluateUpsell(clientProfile: string): Promise<z.infer<typeof UpsellSchema> | null> {
    await this.logger.startTask("Recherche d'opportunité d'upsell (Modules Purity)");

    try {
      const prompt = `
        Voici le profil et les services actuels d'un client existant :
        """${clientProfile}"""

        En te basant strictement sur le catalogue officiel (M01-M07), y a-t-il un ou
        plusieurs modules qui compléteraient parfaitement son offre actuelle ?
        Fournis les codes (ex: "M05") et explique brièvement le raisonnement (LTV).
      `;

      const upsell = await this.think<z.infer<typeof UpsellSchema>>(
        prompt,
        "Stratégie d'Upsell / Cross-sell",
        UpsellSchema
      );

      await this.logger.finishTask(`Recherche terminée. Opportunité: ${upsell.upsellOpportunityFound ? 'OUI' : 'NON'}`);
      return upsell;
    } catch (error) {
      await this.logger.logError(`Échec de l'évaluation d'upsell: ${error}`);
      return null;
    }
  }
}


