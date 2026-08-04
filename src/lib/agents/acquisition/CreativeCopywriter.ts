import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { AutonomousAgent } from './AgentCore';

const EmailDraftSchema = z.object({
  subject: z.string().min(5),
  bodyHtml: z.string().min(30),
});
type EmailDraftResponse = z.infer<typeof EmailDraftSchema>;

// Finding audit 2026-08-02 : "mentionne toujours la subvention" n'existait
// qu'en texte de prompt, jamais vérifié en code. Un humain approuve vite,
// pas ligne à ligne — sans ce contrôle, un email commercialement incomplet
// pouvait partir à un vrai prospect. Vérifié sur le texte généré, jamais
// sur une auto-déclaration du modèle (qui peut se tromper sur lui-même).
const SUBSIDY_MENTION_PATTERN = /ch[eè]ques?[\s-]entreprises?/i;

export class CreativeCopywriter extends AutonomousAgent {
  constructor() {
    super(
      "Creative Copywriter",
      {
        role: [
          "Tu es Manon Verhoeven, Creative Copywriter du pôle Acquisition de",
          "Purity Agency. Tu écris comme quelqu'un qui a fait ses devoirs sur",
          "l'entreprise ciblée, jamais comme un robot poli qui recycle un",
          "template. Chaque email cite un point de douleur précis de l'audit —",
          "jamais une formule générique. Tu proposes exactement le module du",
          "catalogue qui répond à ce point de douleur, prix exact, et tu",
          "mentionnes systématiquement la subvention Chèques Entreprises",
          "Wallonie qui en prend en charge une partie. Objet accrocheur mais",
          "jamais putaclic — le ton reste \"Liquid Glass\" : premium, direct,",
          "sans superlatif vide.",
        ].join(' '),
        department: "01_ACQUISITION",
        knowledgeFiles: [
          "purity_catalogue_officiel_v2.md",
          "BrandRules.md",
          "ForbiddenWords.md"
        ]
      }
    );
  }

  public async draftEmail(leadId: string, customTone?: string, regeneratingDraftId?: string): Promise<void> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });

    if (!lead || (lead.status !== 'ENRICHED' && !regeneratingDraftId)) {
      await this.logger.logError(`Lead non valide ou pas encore ENRICHED: ${leadId}`);
      return;
    }

    const chosenTone = customTone || "Liquid Glass (Premium)";
    await this.logger.startTask(`Rédaction du brouillon d'e-mail pour ${lead.companyName} (Ton: ${chosenTone})`);

    try {
      const auditData: any = lead.auditData || {};
      const painPoints = auditData.painPoints?.join(", ") || "Optimisation générale";
      const modules = auditData.recommendedModules?.join(", ") || "Refonte globale";

      const prompt = `
        Tu es Manon Verhoeven, Creative Copywriter chez Purity Agency (une agence web d'avant-garde basée à Charleroi, Belgique).
        Rédige un e-mail de prospection ultra-personnalisé, court, percutant et humain pour l'entreprise "${lead.companyName}".
        Tu t'adresses à un artisan, commerçant ou dirigeant de PME en Wallonie. Le ton doit être adapté aux consignes de style suivantes :

        Style et Ton requis : "${chosenTone}"
        - Si "Liquid Glass (Premium)" : premium, direct, sans superlatif vide, très factuel et élégant.
        - Si "Direct & Cash" : court, pragmatique, axé sur le ROI direct et le manque à gagner, ton d'égal à égal.
        - Si "Subtil & Conseil" : axé sur l'accompagnement, l'analyse gratuite et l'apport de valeur en conseil, ton chaleureux et expert.
        - Si "Cyber-Futuriste" : axé sur la puissance des agents IA et de l'automatisation, style technique de pointe 2026-2027.

        Détails du destinataire :
        - Entreprise : ${lead.companyName}
        - Localisation : ${lead.location || "Wallonie"}
        - Site Web : ${lead.websiteUrl || "Pas de site actuel"}
        - Nom du contact : ${lead.contactName || "non spécifié"}
        - Rôle du contact : ${lead.contactRole || "dirigeant"}
        - Faiblesses identifiées lors de notre audit : ${painPoints}
        - Modules Purity recommandés : ${modules}

        Directives de rédaction psychologique et humaine :
        1. **Salutation humaine** : Si le nom du contact est connu, commence par "Bonjour ${lead.contactName},". Sinon, utilise "Bonjour," ou "Bonjour ${lead.companyName},".
        2. **Pas d'introduction clichée** : Bannis totalement les formules d'accroche génériques comme "J'espère que vous allez bien", "Je me permets de vous écrire" ou "Je suis Manon de Purity". Commence DIRECTEMENT par une observation factuelle sur leur présence en ligne (ex: "En observant la visibilité locale de ${lead.companyName} à ${lead.location || "Charleroi"}...", "En analysant le site web de ${lead.companyName}...").
        3. **L'impact psychologique** : Relie chaque faiblesse identifiée à sa conséquence financière réelle (ex: un site lent = perte de clients sur mobile, une fiche Google non optimisée = les clients vont chez le concurrent voisin, pas de prise de RDV en ligne = perte de prospects le soir ou le week-end).
        4. **Proposition de valeur concrète** : Présente les modules recommandés en gras avec leurs vrais prix du catalogue Purity (que tu trouveras dans purity_catalogue_officiel_v2.md, ex: **Réservation en Ligne (390 €)**, **Site Vitrine (1 490 €)**, **Pilote Automatique Business (990 €)**).
        5. **Le levier financier (Wallonie)** : Explique de manière simple et rassurante que la Région Wallonne offre la subvention "Chèques Entreprises Wallonie" qui finance jusqu'à 50 % du montant HTVA. Traduis cela en chiffres réels (ex: le module à 1 490 € revient à seulement 745 € après subvention).
        6. **Clarté "Liquid Glass"** : Pas de jargon complexe ni de superlatifs inutiles ("révolutionnaire", etc.). Sois factuel, asymétrique et direct.
        7. **CTA à faible friction (Fitts's Law)** : Une seule question claire pour ouvrir la discussion (ex: "Seriez-vous disponible 10 minutes ce jeudi pour en parler de vive voix ?", "Est-ce qu'on peut s'appeler 10 minutes cette semaine ?").
        8. **Signature professionnelle** : Termine simplement par "Manon Verhoeven — Purity Agency".

        Règles techniques :
        - Évite absolument les mots interdits de ForbiddenWords.md (ex: "Dans le monde d'aujourd'hui", "En conclusion", "N'hésitez pas à nous contacter", "Nous sommes fiers de vous annoncer", "Révolutionnaire", "Plongez dans l'univers de", "Booster").
        - Génère uniquement le sujet de l'email et le corps au format HTML basique (<p>, <br>, <strong>).
      `;

      let result = await this.think<EmailDraftResponse>(prompt, "Génération de l'email de prospection", EmailDraftSchema);

      // Garde-fou code, pas juste prompt (finding audit 2026-08-02) : on
      // vérifie le texte réellement généré, une seule reformulation
      // tentée, puis échec bruyant plutôt qu'un brouillon incomplet.
      if (!SUBSIDY_MENTION_PATTERN.test(result.bodyHtml)) {
        await this.logger.startTask('Mention Chèques Entreprises absente — reformulation forcée');
        const retryPrompt = `${prompt}\n\nTa précédente tentative n'a PAS mentionné "Chèques Entreprises Wallonie" — corrige impérativement cette omission cette fois.`;
        result = await this.think<EmailDraftResponse>(retryPrompt, "Reformulation forcée (mention obligatoire)", EmailDraftSchema);

        if (!SUBSIDY_MENTION_PATTERN.test(result.bodyHtml)) {
          throw new Error(
            "Deux tentatives sans mention de Chèques Entreprises Wallonie — brouillon non créé plutôt que livré incomplet."
          );
        }
      }

      if (regeneratingDraftId) {
        await prisma.emailDraft.update({
          where: { id: regeneratingDraftId },
          data: {
            subject: result.subject,
            bodyHtml: result.bodyHtml,
            tone: chosenTone,
            status: "PENDING_APPROVAL"
          }
        });
      } else {
        await prisma.emailDraft.create({
          data: {
            leadId: lead.id,
            subject: result.subject,
            bodyHtml: result.bodyHtml,
            tone: chosenTone,
            status: "PENDING_APPROVAL"
          }
        });

        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: 'DRAFTED' }
        });
      }

      await this.logger.finishTask(`Brouillon généré pour ${lead.companyName}. En attente de validation CEO.`);

    } catch (error) {
      await this.logger.logError(`Échec de la génération pour ${lead.websiteUrl}: ${error}`);
    }
  }
}
