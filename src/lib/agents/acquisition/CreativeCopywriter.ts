import { prisma } from '@/lib/prisma';
import { AutonomousAgent } from './AgentCore';

export class CreativeCopywriter extends AutonomousAgent {
  constructor() {
    super(
      "Creative Copywriter",
      {
        role: "Concepteur-Rédacteur Liquid Glass. Tu rédiges des e-mails de prospection chirurgicaux, sans bullshit, en utilisant les vrais prix du catalogue Purity et les arguments 'Chèques Entreprises'.",
        department: "01_ACQUISITION",
        knowledgeFiles: [
          "purity_catalogue_officiel_v2.md",
          "BrandRules.md",
          "ForbiddenWords.md"
        ]
      }
    );
  }

  public async draftEmail(leadId: string): Promise<void> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });

    if (!lead || lead.status !== 'ENRICHED') {
      await this.logger.logError(`Lead non valide ou pas encore ENRICHED: ${leadId}`);
      return;
    }

    await this.logger.startTask(`Rédaction du brouillon d'e-mail pour ${lead.companyName}`);

    try {
      const auditData: any = lead.auditData || {};
      const painPoints = auditData.painPoints?.join(", ") || "Optimisation générale";
      const modules = auditData.recommendedModules?.join(", ") || "Refonte globale";

      const prompt = `
        Rédige un e-mail de prospection très court, percutant et "Liquid Glass" (premium, direct, sans bullshit) pour l'entreprise "${lead.companyName}".

        Contexte du lead :
        - Problèmes détectés : ${painPoints}
        - Modules Purity recommandés par l'analyste : ${modules}

        Règles strictes :
        1. Utilise les VRAIS prix de ces modules (trouve-les dans le catalogue Purity).
        2. Mentionne toujours la subvention "Chèques Entreprises Wallonie" (qui prend en charge une partie du prix).
        3. Respecte les BrandRules et n'utilise JAMAIS les ForbiddenWords.
        4. Objet accrocheur (pas putaclic, très pro).
        5. Format HTML basique (<p>, <br>, <strong>).

        Sors le résultat en JSON:
        {
          "subject": "...",
          "bodyHtml": "..."
        }
      `;

      interface EmailDraftResponse { subject: string; bodyHtml: string; }
      const result = await this.think<EmailDraftResponse>(prompt, "Génération de l'email de prospection");

      if (!result.subject || !result.bodyHtml) {
        throw new Error("L'IA n'a pas retourné le format JSON attendu.");
      }

      await prisma.emailDraft.create({
        data: {
          leadId: lead.id,
          subject: result.subject,
          bodyHtml: result.bodyHtml,
          tone: "Premium / Liquid Glass",
          status: "PENDING_APPROVAL"
        }
      });

      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'DRAFTED' }
      });

      await this.logger.finishTask(`Brouillon généré pour ${lead.companyName}. En attente de validation CEO.`);

    } catch (error) {
      await this.logger.logError(`Échec de la génération pour ${lead.websiteUrl}: ${error}`);
    }
  }
}
