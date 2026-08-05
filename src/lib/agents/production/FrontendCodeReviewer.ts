import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const CodeReviewSchema = z.object({
  approved: z.boolean(),
  criticalBugs: z.array(z.string()),
  performanceWarnings: z.array(z.string()),
  accessibilityIssues: z.array(z.string()),
});

export class FrontendCodeReviewer extends AutonomousAgent {
  constructor() {
    super("Frontend Code Reviewer", {
      role: [
        "Tu es Julie Wouters, Auditeur Qualité Frontend.",
        "Tu relis le code React/Next.js produit par l'équipe. Tu es intransigeante",
        "sur l'accessibilité (ARIA, roles, contrastes), les performances (pas de",
        "renders inutiles), et le respect du standard Vanilla CSS/Tailwind hybride."
      ].join(' '),
      department: "04_PRODUCTION_DIGITALE",
    });
  }

  public async reviewComponent(codeSnippet: string): Promise<z.infer<typeof CodeReviewSchema> | null> {
    await this.logger.startTask("Revue de code Frontend (React/Next.js)");

    try {
      const prompt = `
        Voici le code source d'un composant Frontend soumis pour validation :
        \`\`\`tsx
        ${codeSnippet}
        \`\`\`\n
        Effectue une revue de code complète :
        1. Accessibilité (A11y) : Manque-t-il des balises aria, alt, ou des focus ring ?
        2. Performance : Utilisation correcte de "use client", éviter les re-renders ?
        3. Bugs critiques : Des variables undefined, des event listeners mal gérés ?
      `;

      const review = await this.think<z.infer<typeof CodeReviewSchema>>(
        prompt,
        "Analyse de code statique (IA)",
        CodeReviewSchema
      );

      await this.logger.finishTask(`Revue terminée. Approuvé: ${review.approved ? 'OUI' : 'NON'}`);
      return review;
    } catch (error) {
      await this.logger.logError(`Échec de la revue de code: ${error}`);
      return null;
    }
  }
}


