import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { AutonomousAgent } from './AgentCore';

// Instanciation paresseuse — voir le commentaire équivalent dans MarketScout.ts.
// Un `new Resend()` au niveau module fait planter le build Vercel dès que ce
// fichier est importé, même sans appel réel.
let _resend: Resend | undefined;
function getResend(): Resend {
  if (!_resend) {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error(
        '[RevOpsAutomator] RESEND_API_KEY manquant — variable d\'environnement Vercel en ' +
        'production, purity-os/.env en local. Aucun repli silencieux sur une clé factice.'
      );
    }
    _resend = new Resend(resendApiKey);
  }
  return _resend;
}

const WebhookAnalysisSchema = z.object({
  eventType: z.enum(['REPLY_POSITIVE', 'REPLY_NEGATIVE', 'BOUNCE', 'OPEN']),
  actionRequired: z.boolean(),
  reason: z.string(),
});
type WebhookAnalysis = z.infer<typeof WebhookAnalysisSchema>;

export class RevOpsAutomator extends AutonomousAgent {
  constructor() {
    super(
      "RevOps Automator",
      {
        role: [
          "Tu es Thibault Nguyen, RevOps Automator du pôle Acquisition de",
          "Purity Agency. Le relanceur discret qui sait s'arrêter. Tu",
          "n'envoies jamais un brouillon qui n'est pas explicitement",
          "APPROVED par un humain, même si le pipeline semble en retard. Deux",
          "relances maximum par lead — au-delà, c'est du harcèlement",
          "commercial, pas de l'automatisation. Une réponse détectée coupe",
          "immédiatement toute relance programmée pour ce lead.",
        ].join(' '),
        department: "01_ACQUISITION"
      }
    );
  }

  public async executeCampaign(draftId: string): Promise<void> {
    const draft = await prisma.emailDraft.findUnique({
      where: { id: draftId },
      include: { lead: true }
    });

    if (!draft || draft.status !== 'APPROVED') {
      await this.logger.logError(`Draft non valide ou pas encore APPROVED: ${draftId}`);
      return;
    }

    if (!draft.lead.contactEmail) {
      await this.logger.logError(`Impossible d'envoyer l'email, aucun contactEmail pour le lead: ${draft.lead.companyName}`);
      return;
    }

    await this.logger.startTask(`Envoi de la campagne pour ${draft.lead.companyName}`);

    try {
      const { data, error } = await getResend().emails.send({
        from: 'Amir KEBIYEB <amir@purity-agency.be>',
        to: [draft.lead.contactEmail],
        subject: draft.subject,
        html: draft.bodyHtml,
      });

      if (error) {
        throw new Error(error.message);
      }

      await prisma.emailDraft.update({
        where: { id: draftId },
        data: { status: 'SENT' }
      });

      await prisma.lead.update({
        where: { id: draft.leadId },
        data: { status: 'CONTACTED' }
      });

      await this.logger.finishTask(`Email envoyé avec succès (ID: ${data?.id}). Lead passé en CONTACTED.`);

    } catch (error) {
      await this.logger.logError(`Échec de l'envoi pour ${draft.lead.companyName}: ${error}`);
    }
  }

  public async handleWebhook(payload: any): Promise<void> {
    await this.logger.startTask("Traitement du webhook (Bounce/Reply/Open)...");

    const prompt = `
      Voici le payload d'un webhook d'email entrant:
      ${JSON.stringify(payload)}

      Analyse ce webhook. Est-ce une réponse positive, une réponse négative, un rebond (bounce) ou juste une ouverture ?
    `;

    try {
      const analysis = await this.think<WebhookAnalysis>(prompt, "Analyse du Webhook", WebhookAnalysisSchema);

      await this.logger.finishTask(`Webhook traité: ${analysis.eventType} - ${analysis.reason}`);

      if (analysis.actionRequired) {
        await this.logger.startTask("Alerte critique: Intervention humaine requise (Notif CEO)");
        // Todo: Notif CEO via Slack/Discord
      }
    } catch (error) {
      await this.logger.logError(`Erreur lors du traitement LLM du webhook: ${error}`);
    }
  }
}
