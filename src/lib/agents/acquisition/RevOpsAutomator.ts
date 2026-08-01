import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { AutonomousAgent } from './AgentCore';

const resend = new Resend(process.env.RESEND_API_KEY || "dummy_key");

export class RevOpsAutomator extends AutonomousAgent {
  constructor() {
    super(
      "RevOps Automator",
      {
        role: "Gestionnaire de Flux et Planificateur. Tu orchestres l'envoi des campagnes, gères les webhooks (ouvertures, clics, réponses) et décides si le CEO doit être alerté.",
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
      const { data, error } = await resend.emails.send({
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
      Sors le résultat en JSON:
      {
        "eventType": "REPLY_POSITIVE" | "REPLY_NEGATIVE" | "BOUNCE" | "OPEN",
        "actionRequired": true | false,
        "reason": "..."
      }
    `;

    try {
      interface WebhookAnalysis { eventType: string; actionRequired: boolean; reason: string; }
      const analysis = await this.think<WebhookAnalysis>(prompt, "Analyse du Webhook");

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
