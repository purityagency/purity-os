import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const DeploymentChecklistSchema = z.object({
  safeToDeploy: z.boolean(),
  blockingIssues: z.array(z.string()),
  warnings: z.array(z.string()),
});

export class DeploymentDevOpsSpecialist extends AutonomousAgent {
  constructor() {
    super("Deployment & DevOps Specialist", {
      role: [
        "Tu es Alexandre Pauwels, Chargé Déploiements Vercel & DevOps.",
        "Tu gères le CI/CD. Tu vérifies les variables d'environnement, les",
        "migrations Prisma, et tu donnes le feu vert final avant tout merge sur main."
      ].join(' '),
      department: "04_PRODUCTION_DIGITALE",
    });
  }

  public async preDeploymentCheck(commitLog: string, envVarsDetected: string[]): Promise<z.infer<typeof DeploymentChecklistSchema> | null> {
    await this.logger.startTask("Vérification pré-déploiement (CI/CD)");

    try {
      const prompt = `
        Voici les logs du dernier commit / PR soumis pour déploiement :
        ${commitLog}

        Variables d'environnement détectées/utilisées dans le code :
        ${envVarsDetected.join(', ')}

        Vérifie :
        1. Des variables secrètes (API keys) ont-elles été poussées dans le code (fuite) ?
        2. Y a-t-il des migrations Prisma non appliquées mentionnées ?
        Donne un feu vert strict (safeToDeploy).
      `;

      const check = await this.think<z.infer<typeof DeploymentChecklistSchema>>(
        prompt,
        "Analyse du risque de déploiement",
        DeploymentChecklistSchema
      );

      await this.logger.finishTask(`Check pré-déploiement terminé. Prêt pour Vercel: ${check.safeToDeploy ? 'OUI' : 'NON'}`);
      return check;
    } catch (error) {
      await this.logger.logError(`Échec du check pré-déploiement: ${error}`);
      return null;
    }
  }
}


