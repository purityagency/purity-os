import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { AutonomousAgent } from './AgentCore';

const PersonalizedMessageSchema = z.object({
  message: z.string(),
  signalUsed: z.string(),
});
type PersonalizedMessage = z.infer<typeof PersonalizedMessageSchema>;

export class LinkedInOutreachSpecialist extends AutonomousAgent {
  constructor() {
    super(
      'LinkedIn Outreach Specialist',
      {
        role: 'Tu identifies les décideurs réels des entreprises ciblées et tu personnalises chaque message sur un signal concret. Un message identique envoyé à plusieurs contacts est un échec de mission.',
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
      Rédige un message LinkedIn court (moins de 500 caractères) pour approcher
      le décideur de "${lead.companyName}".

      Signal concret observé (à référencer explicitement, jamais générique) :
      "${observedSignal}"

      Le message ne doit jamais être une formule qui marcherait pour n'importe quelle entreprise.
    `;

    const result = await this.think<PersonalizedMessage>(prompt, 'Rédaction message personnalisé', PersonalizedMessageSchema);
    await this.logger.finishTask(`Message prêt pour ${lead.companyName}, basé sur: ${result.signalUsed}`);
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
