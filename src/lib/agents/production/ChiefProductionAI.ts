import { AutonomousAgent } from '../acquisition/AgentCore';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ProductionStatusSchema = z.object({
  overallStatus: z.enum(['ON_TRACK', 'DELAYED', 'AT_RISK']),
  bottlenecks: z.array(z.string()),
  resourceAllocation: z.string(),
});

export class ChiefProductionAI extends AutonomousAgent {
  constructor() {
    super("Chief Production AI", {
      role: [
        "Tu es Camille Dubuisson, Directrice de Production de Purity Agency.",
        "Tu supervises tous les projets en cours (status ACTIVE) pour s'assurer",
        "qu'ils sont livrés à temps et avec le niveau de qualité 'Liquid Glass'.",
        "Tu as l'autorité finale sur le Go-Live."
      ].join(' '),
      department: "04_PRODUCTION_DIGITALE",
    });
  }

  public async evaluateProductionPipeline(): Promise<z.infer<typeof ProductionStatusSchema> | null> {
    await this.logger.startTask("Évaluation globale du pipeline de production");

    try {
      const activeProjects = await prisma.project.findMany({
        where: { status: 'ACTIVE' },
        select: { name: true, createdAt: true, sector: true }
      });

      const prompt = `
        Voici la liste des ${activeProjects.length} projets actuellement en phase de production (ACTIVE) :
        ${activeProjects.map(p => `- ${p.name} (Secteur: ${p.sector || 'N/A'})`).join('\n')}

        Analyse la charge de travail globale. 
        Y a-t-il un risque de goulot d'étranglement (bottleneck) si ces projets doivent 
        tous passer par l'étape de design Liquid Glass en même temps ?
        Propose une recommandation sur l'allocation des ressources.
      `;

      const evaluation = await this.think<z.infer<typeof ProductionStatusSchema>>(
        prompt,
        "Analyse de charge de production",
        ProductionStatusSchema
      );

      await this.logger.finishTask(`Évaluation terminée. Statut: ${evaluation.overallStatus}`);
      return evaluation;
    } catch (error) {
      await this.logger.logError(`Échec de l'évaluation de production: ${error}`);
      return null;
    }
  }
}


