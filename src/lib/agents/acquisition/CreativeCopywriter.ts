import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { AutonomousAgent } from './AgentCore';
import { containsPlaceholder, stripPlaceholders } from '@/lib/emailPlaceholders';

const EmailDraftSchema = z.object({
  objectionPrediction: z.string().describe("Pourquoi ce prospect ne répondrait-il pas ? (Prix, temps, pas intéressé, déjà une agence, manque de confiance)"),
  subject: z.string().describe("Objet du mail : court, intrigant (Pattern Interrupt)"),
  bodyHtml: z.string().describe("Corps du mail en HTML basique (<p>, <br>). Longueur stricte : 40 à 90 mots."),
  selfCritique: z.string().describe("Analyse de ton propre email : Est-ce humain ? Est-ce court ? Est-ce personnalisé ? Est-ce crédible ? Est-ce qu'il donne envie de répondre ?"),
  selfCritiqueScore: z.number().describe("Note sur 10 de la qualité du mail (sois très sévère)"),
  humanDetectorPassed: z.boolean().describe("Vrai si le mail est impossible à distinguer d'un vrai humain tapant sur son clavier, faux s'il sonne comme une IA, un commercial ou s'il tente de vendre.")
});

type EmailDraftResponse = z.infer<typeof EmailDraftSchema>;

export class CreativeCopywriter extends AutonomousAgent {
  constructor() {
    super(
      "Outreach Copywriter AI",
      {
        role: [
          "Tu es un Expert humain qui observe un problème et ouvre une conversation.",
          "Tu n'es pas un commercial. Tu n'es pas un consultant. Tu n'es pas un copain.",
          "L'objectif de l'email n'est pas de convaincre. Il est de susciter suffisamment de curiosité",
          "et de crédibilité pour obtenir une réponse. Si tu tentes de vendre, d'expliquer toute l'offre",
          "ou de multiplier les arguments, tu as échoué. Chaque email doit sembler avoir été écrit",
          "individuellement par un humain qui a réellement observé l'entreprise."
        ].join(' '),
        department: "01_ACQUISITION",
        knowledgeFiles: [
          "BrandRules.md",
          "ForbiddenWords.md"
        ],
        skills: [
          "email-ops",
          "research-ops",
          "messages-ops"
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

    await this.logger.startTask(`Rédaction du brouillon d'e-mail pour ${lead.companyName} (Outreach Copywriter)`);

    try {
      interface AuditData {
        painPoints?: string[]
        recommendedModules?: string[]
      }
      const auditData = (lead.auditData as AuditData | null) || {};
      const painPoints = auditData.painPoints?.join(", ") || "Problème d'optimisation générale";

      const prompt = `
        Tu rédiges le premier email de prospection (Cold Email) pour le lead "${lead.companyName}".
        
        Détails du destinataire :
        - Entreprise : ${lead.companyName}
        - Localisation : ${lead.location || "Wallonie"}
        - Site Web : ${lead.websiteUrl || "Pas de site actuel"}
        - Nom du contact : ${lead.contactName || "non spécifié"}
        - Rôle du contact : ${lead.contactRole || "dirigeant"}
        - Problème identifié (utilise 1 seul point d'attaque) : ${painPoints}

        RÈGLES ABSOLUES (MANUEL OPÉRATOIRE - AOÛT 2026) :
        
        1. OBJECTIF UNIQUE : Le but N'EST PAS de vendre. Le but est UNIQUEMENT de déclencher une conversation (obtenir une réponse).
        
        2. PATTERN INTERRUPT (Casser les codes) :
           - Le cerveau du prospect doit s'arrêter.
           - INTERDIT : "Bonjour Monsieur", "J'espère que vous allez bien", "Je me permets de vous contacter".
           - OBLIGATOIRE : Commence directement par le fait. (Ex: "En regardant votre site, un détail m'a sauté aux yeux.", "J'ai probablement trouvé la raison pour laquelle votre site perd des clients sur mobile.")
        
        3. VALUE FIRST : 
           - Apporte de la valeur avant même de parler de nous (Purity Agency). 
           - Pointe un fait précis (Ex: "Votre PageSpeed mobile est de 41. Cela pénalise probablement votre référencement local.")
        
        4. VARIABLE LENGTH : L'email doit faire entre 40 et 90 mots maximum.
        
        5. LOW FRICTION CTA (Micro-Commitment) : 
           - Le Call-To-Action final demande un très faible niveau d'engagement. Ne fige pas la question, sois contextuel.
           - Urgence -> "Ça vaut le coup qu'on vous montre ?"
           - Curiosité -> "Vous voulez voir ce qu'on changerait ?"
           - Gros problème -> "Je peux vous envoyer les 3 corrections principales."
        
        6. VOUVOIEMENT STRICT : Jamais de tutoiement en B2B Wallonie. Utilise le "vous" professionnellement.

        7. ZÉRO PLACEHOLDER — RÈGLE NON NÉGOCIABLE :
           - INTERDIT ABSOLU d'écrire un champ à remplir : jamais de "[nom du contact]",
             "[prénom]", "[entreprise]", "{{name}}", "[votre nom]", ni aucun crochet
             ou variable de gabarit dans le corps. Un mail avec un crochet = spam automatisé,
             c'est une faute grave.
           - Le nom du contact ci-dessus est "${lead.contactName || "INCONNU"}". S'il est INCONNU :
             tu N'inventes PAS de nom et tu n'insères AUCUN placeholder. Tu écris simplement
             SANS saluer par un nom — commence direct par le fait (Pattern Interrupt).
             En B2B froid sans nom connu, ne pas nommer est parfaitement naturel et attendu.

        INSTRUCTIONS DE RÉFLEXION :
        Avant d'écrire, remplis le champ "objectionPrediction" : Pourquoi ce prospect ne répondrait-il pas ? (Prix, temps, pas intéressé, déjà une agence, manque de confiance).
        Après avoir écrit, remplis "selfCritique" et donne une note sur 10. Si le mail ressemble à ChatGPT (Human Detector), mets humanDetectorPassed à false.
        
        FORMAT DE SORTIE :
        Retourne le sujet (subject) et le corps de l'email (bodyHtml) formaté en HTML simple (<p>, <br>). Ne mentionne pas de prix catalogue.
      `;

      let result = await this.think<EmailDraftResponse>(prompt, "Génération de l'email (Essai 1)", EmailDraftSchema);

      // Boucle de réécriture : Human Detector / Self Critique / présence d'un
      // placeholder (un crochet non rempli = échec immédiat, on réécrit).
      let attempts = 1;
      while (
        (!result.humanDetectorPassed || result.selfCritiqueScore < 8 || containsPlaceholder(result.bodyHtml)) &&
        attempts <= 2
      ) {
        const hadPlaceholder = containsPlaceholder(result.bodyHtml);
        await this.logger.startTask(
          hadPlaceholder
            ? `Email contient un placeholder non rempli — réécriture forcée...`
            : `Email refusé par le Human Detector (Note: ${result.selfCritiqueScore}/10). Réécriture en cours...`
        );
        const placeholderWarning = hadPlaceholder
          ? "\n\nTON EMAIL CONTENAIT UN PLACEHOLDER (crochet à remplir) — c'est une faute grave. Réécris SANS aucun crochet ni nom inventé ; si le nom du contact est inconnu, n'adresse personne par son nom."
          : "";
        const retryPrompt = `${prompt}\n\nTa précédente tentative a échoué. Voici ta propre critique : "${result.selfCritique}".${placeholderWarning}\n\nL'email sonnait trop commercial ou comme une IA. Réécris un email totalement différent, beaucoup plus naturel, cassant encore plus les codes (Pattern Interrupt), et qui passe le Human Detector.`;
        result = await this.think<EmailDraftResponse>(retryPrompt, `Génération de l'email (Essai ${attempts + 1})`, EmailDraftSchema);
        attempts++;
      }

      // Filet final : si un placeholder subsiste malgré les réécritures, on le
      // retire avant sauvegarde — jamais un crochet n'atteint un prospect.
      if (containsPlaceholder(result.bodyHtml)) {
        await this.logger.logError(`Placeholder persistant après réécritures pour ${lead.companyName} — nettoyage appliqué.`);
        result.bodyHtml = stripPlaceholders(result.bodyHtml);
      }

      if (regeneratingDraftId) {
        await prisma.emailDraft.update({
          where: { id: regeneratingDraftId },
          data: {
            subject: result.subject,
            bodyHtml: result.bodyHtml,
            tone: "Outreach (Value First)",
            status: "PENDING_APPROVAL"
          }
        });
      } else {
        await prisma.emailDraft.create({
          data: {
            leadId: lead.id,
            subject: result.subject,
            bodyHtml: result.bodyHtml,
            tone: "Outreach (Value First)",
            status: "PENDING_APPROVAL"
          }
        });

        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: 'DRAFTED' }
        });
      }

      await this.logger.finishTask(`Brouillon "Outreach" généré pour ${lead.companyName} (Note AI: ${result.selfCritiqueScore}/10).`);

    } catch (error) {
      await this.logger.logError(`Échec de la génération pour ${lead.websiteUrl}: ${error}`);
    }
  }
}
