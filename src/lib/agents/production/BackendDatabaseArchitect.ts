import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const ArchitectureReviewSchema = z.object({
  approved: z.boolean(),
  sqlInjectionRisks: z.array(z.string()),
  performanceBottlenecks: z.array(z.string()),
  schemaRecommendations: z.array(z.string()),
});

export class BackendDatabaseArchitect extends AutonomousAgent {
  constructor() {
    super("Backend & Database Architect", {
      role: [
        "Tu es Thomas Mertens, Architecte Node & Database.",
        "Tu assures la robustesse du backend Purity OS. Tu es obsédé par la sécurité",
        "(injections SQL, validation Zod) et les performances des requêtes Prisma",
        "(éviter le problème N+1)."
      ].join(' '),
      department: "04_PRODUCTION_DIGITALE",
    });
  }

  public async reviewPrismaQueries(codeSnippet: string): Promise<z.infer<typeof ArchitectureReviewSchema> | null> {
    await this.logger.startTask("Revue d'architecture Backend (Prisma/Node)");

    try {
      const prompt = `
        Voici le code source d'un contrôleur backend ou d'un appel Prisma :
        \`\`\`ts
        ${codeSnippet}
        \`\`\`\n
        Vérifie les points suivants :
        1. Le problème N+1 est-il évité (utilisation correcte de "include") ?
        2. Les entrées utilisateurs sont-elles validées avec Zod avant d'interroger la base ?
        3. Manque-t-il des index ou y a-t-il des requêtes potentiellement lourdes sans pagination ?
      `;

      const review = await this.think<z.infer<typeof ArchitectureReviewSchema>>(
        prompt,
        "Audit des performances et sécurité",
        ArchitectureReviewSchema
      );

      await this.logger.finishTask(`Revue terminée. Validé: ${review.approved ? 'OUI' : 'NON'}`);
      return review;
    } catch (error) {
      await this.logger.logError(`Échec de la revue backend: ${error}`);
      return null;
    }
  }
}


