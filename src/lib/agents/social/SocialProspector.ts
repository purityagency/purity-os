import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { AutonomousAgent } from '@/lib/agents/acquisition/AgentCore';

// ─────────────────────────────────────────────────────────────────────────────
// Social Prospector — agent de prospection par DM Instagram du pôle 07.
// Persona : Nora Aktas. Même philosophie que l'agent LinkedIn (Adam Peeters) :
// ouvrir une conversation via un signal concret, jamais vendre au 1er message.
// Il travaille sur les leads RÉELS du CRM Acquisition (modèle Lead).
// ─────────────────────────────────────────────────────────────────────────────

const DmSchema = z.object({
  objectionPrediction: z.string().describe("Pourquoi ce prospect ignorerait-il ce DM ? (trop sollicité, signal faible…)"),
  message: z.string().describe("Le DM Instagram final (moins de 280 caractères, ton chaleureux mais pro)"),
  signalUsed: z.string().describe("Le signal concret utilisé pour briser la glace"),
  selfCritique: z.string().describe("Auto-critique : humain ? court ? personnalisé ? donne envie de répondre ?"),
  humanScore: z.number().min(0).max(10).describe("Note /10 : impossible à distinguer d'un humain. 0 = sonne IA/commercial."),
});
export type InstagramDm = z.infer<typeof DmSchema>;

export class SocialProspector extends AutonomousAgent {
  constructor() {
    super(
      'Nora Aktas — Social Prospector',
      {
        role: [
          "Tu es Nora Aktas, experte humaine en prospection par DM Instagram.",
          "Ton but est d'ouvrir une conversation, PAS de vendre. Tu utilises un signal concret",
          "sur le prospect pour prouver que tu n'es pas un robot. Tu refuses les formules génériques.",
          "Chaque DM doit sembler écrit à la main en 20 secondes depuis le téléphone.",
        ].join(' '),
        department: '07_VISIBILITE_SOCIALE',
        knowledgeFiles: ['SocialStrategy.md', 'InstagramPlaybook.md', 'ToneOfVoice.md'],
      }
    );
  }

  /** Déduit un signal concret exploitable à partir des données réelles du lead. */
  private deriveSignal(lead: { companyName: string; location: string | null; websiteUrl: string | null; auditData: unknown }): string {
    const audit = (lead.auditData ?? {}) as { painPoints?: string[] };
    const pain = Array.isArray(audit.painPoints) && audit.painPoints.length > 0 ? audit.painPoints[0] : null;
    if (pain) return `Point faible observé sur leur présence en ligne : ${pain}`;
    if (!lead.websiteUrl) return `${lead.companyName} n'a pas de site web identifié — présence en ligne très faible`;
    return `Site en ligne (${lead.websiteUrl}) mais probablement sous-exploité pour convertir`;
  }

  public async draftInstagramDM(leadId: string): Promise<InstagramDm> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error(`Lead introuvable: ${leadId}`);
    if (lead.optedOut) throw new Error(`Lead désinscrit — ne pas contacter: ${leadId}`);

    const signal = this.deriveSignal(lead);
    await this.logger.startTask(`Rédaction DM Instagram pour ${lead.companyName}`);

    const prompt = `
      Rédige un DM Instagram ultra-court (moins de 280 caractères) pour approcher
      le dirigeant de "${lead.companyName}"${lead.location ? ` (${lead.location})` : ''}.

      Signal concret à référencer en ouverture (Pattern Interrupt) :
      "${signal}"

      RÈGLES ABSOLUES :
      1. OBJECTIF UNIQUE : obtenir une réponse. Interdit de vendre ou de piocher dans le catalogue Purity.
      2. PATTERN INTERRUPT : pas de "Bonjour, j'espère que vous allez bien". Commence par le signal concret.
      3. LOW FRICTION CTA : une question simple à la fin.
      4. Ton Instagram : chaleureux, humain, tutoiement, mais crédible et pro. Zéro langage IA générique.
      5. Zéro Mock Data : n'invente aucun chiffre ni résultat.

      Remplis l'analyse (objectionPrediction), écris le message, puis auto-critique (selfCritique + humanScore /10). Vise >= 8.
    `;

    return this.think<InstagramDm>(prompt, undefined, DmSchema);
  }
}
