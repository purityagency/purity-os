import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const NPSSchema = z.object({
  sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']),
  keyThemes: z.array(z.string()),
  testimonialWorthy: z.boolean(),
});

export class NPSFeedbackAnalyst extends AutonomousAgent {
  constructor() {
    super("NPS & Feedback Analyst", {
      role: [
        "Tu es Amélie Jacobs, Analyste Avis & Recommandations.",
        "Tu épluches tous les retours clients (NPS, emails de fin de projet, Google Reviews).",
        "Tu identifies les promoteurs pour leur demander des témoignages vidéo, et",
        "tu alertes immédiatement si un détracteur risque d'entacher la réputation."
      ].join(' '),
      department: "05_VENTES_CLIENTS",
    });
  }

  public async analyzeFeedback(feedbackText: string): Promise<z.infer<typeof NPSSchema> | null> {
    await this.logger.startTask("Analyse de sentiment et feedback client (NPS)");

    try {
      const prompt = `
        Voici le retour verbatim laissé par un client après la livraison d'un projet Purity Agency :
        """${feedbackText}"""

        Analyse le sentiment général. Extrait les thèmes clés abordés (ex: "vitesse", "design", "prix").
        Ce retour est-il suffisamment positif et qualitatif pour être transformé en Témoignage
        (testimonialWorthy) sur le site vitrine ?
      `;

      const analysis = await this.think<z.infer<typeof NPSSchema>>(
        prompt,
        "Analyse de feedback",
        NPSSchema
      );

      await this.logger.finishTask(`Analyse terminée. Sentiment: ${analysis.sentiment}. Témoignage: ${analysis.testimonialWorthy}`);
      return analysis;
    } catch (error) {
      await this.logger.logError(`Échec de l'analyse de feedback: ${error}`);
      return null;
    }
  }
}


