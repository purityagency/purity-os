import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const GrantScoutSchema = z.object({
  eligibleSubsidiesFound: z.number(),
  topRecommendation: z.string().nullable(),
  estimatedAmount: z.number(),
});

export class GrantSubsidyScout extends AutonomousAgent {
  constructor() {
    super("Grant & Subsidy Scout", {
      role: [
        "Tu es Fatima Ouahbi, Chargée des Subventions Wallonie. Tu surveilles",
        "en permanence les primes de la Région Wallonne (ex: Chèques-Entreprises,",
        "primes à l'investissement numérique) pour maximiser les aides que nos clients",
        "peuvent recevoir, ou que l'agence peut toucher pour sa propre R&D."
      ].join(' '),
      department: "02_FINANCE",
    });
  }

  public async scoutDigitalGrants(clientSector: string): Promise<z.infer<typeof GrantScoutSchema> | null> {
    await this.logger.startTask(`Recherche de subventions (Secteur: ${clientSector})`);

    try {
      const prompt = `
        Un nouveau client du secteur "${clientSector}" situé en Région Wallonne (Belgique) 
        souhaite refaire sa plateforme digitale.
        Quelles subventions ou primes (ex: Chèques-Entreprises) sont potentiellement applicables ?
        Combien (en euros) peuvent-ils espérer recevoir (estimatedAmount) ?
      `;

      const scout = await this.think<z.infer<typeof GrantScoutSchema>>(
        prompt,
        "Analyse de primes régionales",
        GrantScoutSchema
      );

      await this.logger.finishTask(`Recherche terminée. Aides possibles: ${scout.eligibleSubsidiesFound}. Recommandation: ${scout.topRecommendation}`);
      return scout;
    } catch (error) {
      await this.logger.logError(`Échec de la recherche de subventions: ${error}`);
      return null;
    }
  }
}

