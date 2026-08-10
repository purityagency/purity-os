import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { AutonomousAgent } from './AgentCore';
import { containsPlaceholder, stripPlaceholders, describeForbidden } from '@/lib/emailPlaceholders';

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

        8. INTERDICTIONS ABSOLUES DE CONTENU (fautes graves — si présentes, mets humanDetectorPassed à false) :
           - JAMAIS de code module interne : "M04", "M07", "(M07)", "Mxx"… Ce sont des identifiants
             INTERNES. Parle du bénéfice concret ("un site rapide sur mobile"), jamais du code.
           - JAMAIS de prix ni montant en euros ("1 490 €", "290 €"). Le but n'est PAS de vendre ni
             de chiffrer — c'est d'ouvrir une conversation. Un prix dans un premier mail = échec.
           - JAMAIS de "Bonjour," / "Bonjour Madame, Monsieur" en ouverture générique : commence
             directement par le fait observé (Pattern Interrupt, règle 2).
           - JAMAIS de crochet [ ], parenthèse de gabarit, ou variable à remplir.
           - JAMAIS de parenthèse-instruction ni d'artefact d'IA : "(voir image)", "(insérer …)",
             "(lien vers …)", "(votre nom)", "(à compléter)". Ce sont des restes de gabarit. Écris
             la phrase FINIE, ou n'écris rien à cet endroit.
           - CET EMAIL EST DU TEXTE SEUL : il n'a AUCUNE image ni pièce jointe. Ne référence JAMAIS
             une image, une capture d'écran, un logo visuel, "ci-joint" ou "en pièce jointe". Si tu
             veux montrer un problème visuel, DÉCRIS-le en mots ("votre page d'accueil met plusieurs
             secondes à s'afficher"), ne renvoie pas à une image.

        INSTRUCTIONS DE RÉFLEXION :
        Avant d'écrire, remplis le champ "objectionPrediction" : Pourquoi ce prospect ne répondrait-il pas ? (Prix, temps, pas intéressé, déjà une agence, manque de confiance).
        Après avoir écrit, remplis "selfCritique" et donne une note sur 10. Si le mail ressemble à ChatGPT, contient un code Mxx, un prix en €, un "Bonjour" générique ou un placeholder → humanDetectorPassed = false.

        FORMAT DE SORTIE :
        Retourne le sujet (subject) et le corps de l'email (bodyHtml) formaté en HTML simple (<p>, <br>). Aucun prix, aucun code module, aucune parenthèse de gabarit.
      `;

      let result = await this.think<EmailDraftResponse>(prompt, "Génération de l'email (Essai 1)", EmailDraftSchema);

      // Boucle de réécriture : Human Detector / Self Critique / présence d'un
      // placeholder (un crochet non rempli = échec immédiat, on réécrit).
      let attempts = 1;
      while (
        (!result.humanDetectorPassed || result.selfCritiqueScore < 8 || containsPlaceholder(result.bodyHtml)) &&
        attempts <= 3
      ) {
        const forbidden = describeForbidden(result.bodyHtml);
        await this.logger.startTask(
          forbidden
            ? `Email contient du contenu interdit (${forbidden}) — réécriture forcée...`
            : `Email refusé par le Human Detector (Note: ${result.selfCritiqueScore}/10). Réécriture en cours...`
        );
        const placeholderWarning = forbidden
          ? `\n\nTON EMAIL CONTENAIT DU CONTENU INTERDIT : ${forbidden}. C'est une faute grave qui fera rejeter le mail automatiquement. Réécris SANS ce contenu : pas de crochet, pas de parenthèse-instruction type "(voir image)", pas de référence à une image/pièce jointe, pas de code Mxx, pas de prix. Si le nom du contact est inconnu, n'adresse personne par son nom.`
          : "";
        const retryPrompt = `${prompt}\n\nTa précédente tentative a échoué. Voici ta propre critique : "${result.selfCritique}".${placeholderWarning}\n\nRéécris un email totalement différent, beaucoup plus naturel, cassant encore plus les codes (Pattern Interrupt), et qui passe le Human Detector.`;
        result = await this.think<EmailDraftResponse>(retryPrompt, `Génération de l'email (Essai ${attempts + 1})`, EmailDraftSchema);
        attempts++;
      }

      // Filet final : nettoyage best-effort de ce qui est nettoyable
      // (crochets/accolades/parenthèses de gabarit).
      if (containsPlaceholder(result.bodyHtml)) {
        result.bodyHtml = stripPlaceholders(result.bodyHtml);
      }

      // COHÉRENCE : si après réécritures + nettoyage le mail reste interdit
      // (typiquement un code Mxx ou un prix, non nettoyables), on NE crée PAS un
      // brouillon condamné à l'auto-refus. On loggue et on laisse le lead
      // ENRICHED pour un nouvel essai — jamais de brouillon voué au rejet.
      const stillForbidden = describeForbidden(result.bodyHtml);
      if (stillForbidden && !regeneratingDraftId) {
        await this.logger.logError(
          `Brouillon NON créé pour ${lead.companyName} : contenu interdit persistant (${stillForbidden}). Le lead reste ENRICHED pour régénération.`,
        );
        return;
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

  /**
   * Génère une RELANCE (follow-up) sous forme de brouillon à valider. Cadence
   * J+3 / J+7 (recherche 2026 : max 2 relances, 42% des réponses viennent
   * uniquement des follow-ups). Règle d'or : une relance apporte du NEUF (un
   * nouvel angle, une observation), jamais un "je reviens vers vous" creux.
   * Incrémente lead.relanceCount pour ne pas régénérer indéfiniment.
   */
  public async draftFollowUp(leadId: string, relanceNumber: 1 | 2): Promise<string | null> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.status !== 'CONTACTED' || lead.optedOut || !lead.contactEmail) return null;

    await this.logger.startTask(`Relance ${relanceNumber} pour ${lead.companyName} (Outreach Copywriter)`);

    try {
      const auditData = (lead.auditData as { painPoints?: string[] } | null) || {};
      const painPoints = auditData.painPoints?.join(", ") || "optimisation générale";

      const prompt = `
        Tu écris la RELANCE n°${relanceNumber} pour "${lead.companyName}" (${lead.location || "Wallonie"}).
        Un premier email de prospection a déjà été envoyé et est resté sans réponse. Ce n'est PAS le premier contact.

        Problème identifié précédemment : ${painPoints}
        Nom du contact : ${lead.contactName || "INCONNU"}

        RÈGLES ABSOLUES :
        1. APPORTE DU NEUF : un nouvel angle, une observation concrète, un mini-conseil actionnable, une preuve.
           INTERDIT : "je reviens vers vous", "avez-vous eu le temps de", "petit rappel", "je me permets de relancer".
        2. ULTRA COURT : 25 à 55 mots. Une relance est plus courte que le 1er mail.
        3. LÉGER, PAS INSISTANT : le ton reste celui de quelqu'un qui rend service, pas d'un commercial qui presse.
        4. VOUVOIEMENT B2B strict. Aucune salutation nominative inventée : si le nom est INCONNU, n'adresse personne par son nom.
        5. ZÉRO PLACEHOLDER + ZÉRO code module (Mxx) + ZÉRO prix en euros + pas de "Bonjour" générique. Fautes graves.
           Aussi INTERDIT : parenthèse-instruction "(voir image)", "(insérer …)", et toute référence à
           une image / capture / pièce jointe — ce mail est du texte seul. Décris en mots, ne renvoie
           jamais à un visuel.
        6. CTA micro-engageant et contextuel (une question simple).

        Remplis objectionPrediction, puis écris, puis selfCritique + note. Human Detector strict.
      `;

      let result = await this.think<EmailDraftResponse>(prompt, `Relance ${relanceNumber} (Essai 1)`, EmailDraftSchema);

      let attempts = 1;
      while (
        (!result.humanDetectorPassed || result.selfCritiqueScore < 8 || containsPlaceholder(result.bodyHtml)) &&
        attempts <= 3
      ) {
        const forbidden = describeForbidden(result.bodyHtml);
        const warn = forbidden ? ` Contenu interdit détecté (${forbidden}) — retire-le absolument.` : "";
        const retryPrompt = `${prompt}\n\nTa tentative a échoué : "${result.selfCritique}".${warn}\n\nRéécris, encore plus naturel et plus court, en apportant un angle VRAIMENT nouveau, sans aucun placeholder ni parenthèse-instruction ni référence à une image.`;
        result = await this.think<EmailDraftResponse>(retryPrompt, `Relance ${relanceNumber} (Essai ${attempts + 1})`, EmailDraftSchema);
        attempts++;
      }

      if (containsPlaceholder(result.bodyHtml)) {
        result.bodyHtml = stripPlaceholders(result.bodyHtml);
      }

      // Cohérence : jamais de relance condamnée. Si un contenu interdit non
      // nettoyable persiste, on n'écrit rien et on n'incrémente pas le compteur.
      const stillForbidden = describeForbidden(result.bodyHtml);
      if (stillForbidden) {
        await this.logger.logError(`Relance ${relanceNumber} NON créée pour ${lead.companyName} : contenu interdit persistant (${stillForbidden}).`);
        return null;
      }

      // Brouillon de relance + incrément du compteur, en transaction : on ne
      // veut jamais incrémenter sans créer le brouillon (ni l'inverse).
      const [created] = await prisma.$transaction([
        prisma.emailDraft.create({
          data: {
            leadId: lead.id,
            subject: result.subject,
            bodyHtml: result.bodyHtml,
            tone: `Relance ${relanceNumber}`,
            status: "PENDING_APPROVAL",
          },
        }),
        prisma.lead.update({ where: { id: lead.id }, data: { relanceCount: relanceNumber } }),
      ]);

      await this.logger.finishTask(`Relance ${relanceNumber} générée pour ${lead.companyName} (Note AI: ${result.selfCritiqueScore}/10).`);
      return created.id;
    } catch (error) {
      await this.logger.logError(`Échec relance ${relanceNumber} pour ${lead.companyName}: ${error}`);
      return null;
    }
  }
}
