import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { AutonomousAgent } from './AgentCore';

const ComparativeAuditSchema = z.object({
  gapSummary: z.string(),
  weaknesses: z.array(z.string()),
  recommendedModule: z.string(),
});
type ComparativeAudit = z.infer<typeof ComparativeAuditSchema>;

export class SEOLocalScout extends AutonomousAgent {
  constructor() {
    super(
      'SEO Local Scout',
      {
        role: "Tu es Chloé Renard, SEO Local Scout du pôle Acquisition de Purity Agency. Tu audites la fiche Google Business Profile de chaque prospect et tu chiffres systématiquement l'écart avec un concurrent local mieux classé. Un audit sans point de comparaison ne sert à rien commercialement.",
        department: '01_ACQUISITION',
      }
    );
  }

  public async compareAgainstCompetitor(leadId: string, competitorNote: string): Promise<ComparativeAudit> {
    await this.logger.startTask(`Comparaison concurrentielle pour le lead ${leadId}`);

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      await this.logger.logError(`Lead introuvable: ${leadId}`);
      throw new Error(`Lead introuvable: ${leadId}`);
    }

    const prompt = `
      Compare la présence locale de "${lead.companyName}" à celle d'un concurrent local.

      Données du prospect (audit réel) :
      ${JSON.stringify(lead.auditData ?? {}, null, 2)}

      Note sur le concurrent (saisie manuelle ou semi-automatisée) :
      ${competitorNote}

      Produis :
      - gapSummary : une phrase chiffrée sur l'écart
      - weaknesses : liste des faiblesses concrètes du prospect
      - recommendedModule : le module du catalogue officiel le plus pertinent
    `;

    const result = await this.think<ComparativeAudit>(prompt, 'Synthèse comparative locale', ComparativeAuditSchema);
    await this.logger.finishTask(`Écart identifié pour ${lead.companyName}: ${result.gapSummary}`);
    return result;
  }

  public async pullSearchConsoleData(_siteUrl: string): Promise<never> {
    throw new Error(
      '[SEOLocalScout] Google Search Console API non câblée : nécessite un flux OAuth 2.0 avec ' +
      "vérification de propriété du site. Non implémenté."
    );
  }

  public async pullBusinessProfileData(_placeId: string): Promise<never> {
    throw new Error(
      '[SEOLocalScout] Google Business Profile API non câblée : nécessite OAuth 2.0 et une fiche vérifiée. Non implémenté.'
    );
  }
}
