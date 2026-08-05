import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const UXUIDesignAuditSchema = z.object({
  aestheticScore: z.number().min(0).max(100),
  glassmorphismIssues: z.array(z.string()),
  fittsLawCompliant: z.boolean(),
  recommendations: z.array(z.string()),
});

export class UXUIDesignerAgent extends AutonomousAgent {
  constructor() {
    super("UX/UI Designer Agent", {
      role: [
        "Tu es Sébastien Laurent, Designer UI 'Liquid Glass' chez Purity Agency.",
        "Tu es l'architecte du design system. Tu veilles à ce que chaque interface",
        "respecte le Dark Theme (#060309), les micro-animations, et la loi de Fitts",
        "pour maximiser la clarté et le clic."
      ].join(' '),
      department: "04_PRODUCTION_DIGITALE",
    });
  }

  public async auditDesignSpecs(designDescription: string): Promise<z.infer<typeof UXUIDesignAuditSchema> | null> {
    await this.logger.startTask("Audit des spécifications UI/UX");

    try {
      const prompt = `
        Un développeur propose la spécification d'interface suivante pour un composant :
        """${designDescription}"""

        Évalue rigoureusement cette spécification selon le standard Purity Agency :
        1. Utilise-t-elle le thème sombre avec l'accent violet (#7C3AED) ?
        2. Les boutons et zones de clic respectent-ils la loi de Fitts (densité, hitbox) ?
        3. Y a-t-il des effets "Liquid Glass" (glassmorphism, blur) bien dosés ?
      `;

      const audit = await this.think<z.infer<typeof UXUIDesignAuditSchema>>(
        prompt,
        "Vérification des standards Liquid Glass",
        UXUIDesignAuditSchema
      );

      await this.logger.finishTask(`Audit UI terminé. Score Esthétique: ${audit.aestheticScore}/100. Fitts Law: ${audit.fittsLawCompliant ? 'OUI' : 'NON'}`);
      return audit;
    } catch (error) {
      await this.logger.logError(`Échec de l'audit design: ${error}`);
      return null;
    }
  }
}


