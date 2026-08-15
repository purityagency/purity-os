import { z } from 'zod';
import { AutonomousAgent } from './AgentCore';
import { buildSalesKit, type LeadKitInput } from '@/lib/acquisition/salesKit';

const StrategySchema = z.object({
  executiveSummary: z.string(),
  biggestProblem: z.string(),
  bestAngle: z.string(),
  idealOffer: z.string(),
  actionPlan30Days: z.array(z.object({ week: z.number(), action: z.string() })).length(4),
});
export type OpportunityStrategy = z.infer<typeof StrategySchema>;

/**
 * Génère, à la demande, une stratégie d'attaque commerciale pour un lead —
 * résumé exécutif + plan d'action 4 semaines. Raisonne sur la sortie DÉJÀ
 * calculée de buildSalesKit() (angles, findings, archétype, service
 * recommandé) plutôt que sur les champs bruts de la base : le LLM organise et
 * priorise un diagnostic déjà réel, il n'en invente jamais un nouveau.
 */
export class OpportunityStrategist extends AutonomousAgent {
  constructor() {
    super(
      'Opportunity Strategist',
      {
        role: [
          "Tu es Lucas Verstraete, Opportunity Strategist du pôle Acquisition",
          "de Purity Agency. Tu ne fais QUE synthétiser et prioriser un",
          "diagnostic déjà établi (angles de vente, points de douleur, service",
          "recommandé) — tu n'inventes jamais un problème ou un chiffre qui",
          "n'apparaît pas dans les données fournies. Ton plan d'action tient",
          "sur 4 semaines, concret, jamais générique.",
        ].join(' '),
        department: '01_ACQUISITION',
      }
    );
  }

  public async generateStrategy(input: LeadKitInput): Promise<OpportunityStrategy> {
    await this.logger.startTask(`Stratégie d'opportunité pour ${input.companyName}`);

    const kit = buildSalesKit(input)
    const top3Angles = kit.angles.slice(0, 3).map((a) => `${a.label} (score ${a.score}) — douleur probable : ${a.dailyPain}`).join('\n')
    const findings = kit.findings.map((f) => `- [${f.severity}] ${f.title}${f.detail ? ` — ${f.detail}` : ''}`).join('\n')

    const prompt = `
      Entreprise : ${input.companyName}${input.location ? ` (${input.location})` : ''}
      Profil décisionnel estimé : ${kit.archetype.label} — convaincu par : ${kit.archetype.convinces.join(', ')} ; déteste : ${kit.archetype.hates.join(', ')}

      Angles de vente possibles (du plus au moins pertinent) :
      ${top3Angles}

      Constats détectés :
      ${findings}

      Service Purity déjà identifié comme prioritaire : ${kit.serviceRecommendation.primary.label} — ${kit.serviceRecommendation.primary.why}
      Upsell naturel : ${kit.serviceRecommendation.upsell.label}

      À partir de CES données réelles uniquement (n'invente rien d'autre) :
      1. Un résumé exécutif de 3 phrases (le problème principal, le meilleur angle d'attaque, l'offre idéale).
      2. Reformule séparément : plus gros problème, meilleur angle, offre idéale.
      3. Un plan d'action sur 4 semaines (une action concrète par semaine, priorisée par impact).
    `;

    const strategy = await this.think<OpportunityStrategy>(prompt, 'Génération de la stratégie', StrategySchema);
    await this.logger.finishTask(`Stratégie prête pour ${input.companyName} : ${strategy.bestAngle}`);
    return strategy;
  }
}
