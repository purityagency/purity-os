import { WorkflowStep } from '@/core/workflows';
import { prisma } from '@/lib/prisma';

export interface OnboardingContext {
  projectId: string;
  sector: string | null;
}

export class GenerateKanbanStagesStep implements WorkflowStep<OnboardingContext> {
  name = 'GenerateKanbanStages';

  async execute(context: OnboardingContext): Promise<void> {
    // Check for idempotency: if stages exist, do nothing
    const existing = await prisma.stage.findFirst({ where: { projectId: context.projectId } });
    if (existing) return;

    const stages = [
      { title: "Briefing & Kickoff", desc: "Validation des objectifs et de l'identité" },
      { title: "Design System & Maquettes", desc: "Création de l'UI/UX Liquid Glass" },
      { title: "Développement", desc: "Intégration technique et performances" },
      { title: "Recette & Tests", desc: "QA, Audit Sécurité et Accessibilité" },
      { title: "Déploiement & SEO", desc: "Mise en ligne, indexation et analytique" },
      { title: "Suivi & NPS", desc: "Mesure de satisfaction et parrainage" },
    ]

    await Promise.all(stages.map((st, i) => 
      prisma.stage.create({
        data: {
          projectId: context.projectId,
          title: st.title,
          description: st.desc,
          orderIndex: i,
          status: i === 0 ? "IN_PROGRESS" : "PENDING",
        }
      })
    ));
  }
}
