import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { AutonomousAgent } from './AgentCore';

const PersonalizedMessageSchema = z.object({
  objectionPrediction: z.string().describe("Pourquoi ce prospect ignorerait-il ce message sur LinkedIn ? (Déjà trop sollicité, signal faible, etc.)"),
  message: z.string().describe("Le message LinkedIn final (moins de 300 caractères)"),
  signalUsed: z.string().describe("Rappel du signal concret utilisé pour briser la glace"),
  selfCritique: z.string().describe("Auto-critique : est-ce humain ? court ? personnalisé ? donne envie de répondre ?"),
  selfCritiqueScore: z.number().describe("Note sur 10 de la qualité du message"),
  humanDetectorPassed: z.boolean().describe("Vrai si le message est impossible à distinguer d'un humain, faux s'il sonne IA ou commercial.")
});
type PersonalizedMessage = z.infer<typeof PersonalizedMessageSchema>;

export class LinkedInOutreachSpecialist extends AutonomousAgent {
  constructor() {
    super(
      'LinkedIn Outreach Specialist',
      {
        role: [
          "Tu es Adam Peeters, Expert humain en prospection sur LinkedIn.",
          "Ton but est d'ouvrir une conversation, pas de vendre. Tu utilises un signal concret",
          "pour prouver que tu n'es pas un robot d'automatisation. Tu refuses les formules génériques.",
          "Chaque message doit sembler avoir été écrit à la main en 30 secondes depuis l'app mobile LinkedIn."
        ].join(' '),
        department: '01_ACQUISITION',
      }
    );
  }

  public async draftPersonalizedMessage(leadId: string, observedSignal: string): Promise<PersonalizedMessage> {
    if (!observedSignal || observedSignal.trim().length === 0) {
      throw new Error('[LinkedInOutreachSpecialist] Aucun signal fourni — sans signal concret, on ne rédige pas.');
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      await this.logger.logError(`Lead introuvable: ${leadId}`);
      throw new Error(`Lead introuvable: ${leadId}`);
    }

    await this.logger.startTask(`Rédaction message LinkedIn pour ${lead.companyName}`);

    const prompt = `
      Rédige un message LinkedIn ultra-court (moins de 300 caractères) pour approcher
      le décideur de "${lead.companyName}".

      Signal concret observé (à référencer explicitement en guise de Pattern Interrupt) :
      "${observedSignal}"

      RÈGLES ABSOLUES (OUTREACH 2026) :
      1. OBJECTIF UNIQUE : Obtenir une réponse ou une acceptation de connexion. Interdit de vendre ou piocher dans le catalogue Purity.
      2. PATTERN INTERRUPT : Pas de "Bonjour", "J'espère que vous allez bien". Commence direct par le signal observé (ex: "J'ai vu votre dernier post sur...").
      3. LOW FRICTION CTA : Une question hyper simple à la fin.
      4. VOUVOIEMENT STRICT.
      
      INSTRUCTIONS DE RÉFLEXION :
      Remplis l'analyse (objectionPrediction) puis écris le message. Ensuite critique-le (selfCritique, Score et humanDetector).
    `;

    let result = await this.think<PersonalizedMessage>(prompt, 'Rédaction message LinkedIn', PersonalizedMessageSchema);

    // Boucle de réécriture Human Detector / Self Critique (Max 2 retries)
    let attempts = 1;
    while ((!result.humanDetectorPassed || result.selfCritiqueScore < 8) && attempts <= 2) {
      await this.logger.startTask(`Message LinkedIn refusé par Human Detector (Note: ${result.selfCritiqueScore}/10). Réécriture...`);
      const retryPrompt = \`\${prompt}\n\nTa précédente tentative a échoué. Ta propre critique : "\${result.selfCritique}".\n\nLe message sonnait trop commercial ou comme une IA. Réécris un message totalement différent, beaucoup plus naturel, cassant encore plus les codes (Pattern Interrupt).\`;
      result = await this.think<PersonalizedMessage>(retryPrompt, \`Rédaction message LinkedIn (Essai \${attempts + 1})\`, PersonalizedMessageSchema);
      attempts++;
    }

    await this.logger.finishTask(`Message prêt pour ${lead.companyName}, basé sur: ${result.signalUsed} (Note AI: ${result.selfCritiqueScore}/10).`);
    return result;
  }

  public async findDecisionMaker(_companyName: string): Promise<never> {
    throw new Error(
      '[LinkedInOutreachSpecialist] Aucune clé LinkedIn Sales Navigator / PhantomBuster dans secrets/.'
    );
  }

  public async sendMessage(_leadId: string, _message: string): Promise<never> {
    throw new Error('[LinkedInOutreachSpecialist] Aucun envoi automatisé — canal manuel uniquement.');
  }
}
