import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { AutonomousAgent } from './AgentCore';
import { containsPlaceholder, stripPlaceholders, describeForbidden } from '@/lib/emailPlaceholders';
import { buildSalesKit } from '@/lib/acquisition/salesKit';
import { buildLeadKitInput, sectorFromMissionParameters } from '@/lib/acquisition/buildLeadKitInput';

const EmailDraftSchema = z.object({
  objectionPrediction: z.string().describe("Analyse de l'objection principale probable du prospect (temps, prestataire actuel, méfiance prospection, budget)."),
  subject: z.string().describe("Objet du mail : ultra-précis, factuel, professionnel, sans artifice commercial ni majuscules agressives (ex: 'Remarque technique — site mobile de [Entreprise]')."),
  bodyHtml: z.string().describe("Corps du mail en HTML simple (<p>, <br>). Longueur stricte : 40 à 80 mots max. Ton humain, vouvoiement strict, factuel."),
  selfCritique: z.string().describe("Évaluation critique du mail : Est-il 100% concrétisé sur l'audit ? Y a-t-il le moindre mot d'IA ou jargon marketing ? Est-il crédible pour un dirigeant PME ?"),
  selfCritiqueScore: z.number().describe("Note de 1 à 10 sur la qualité et le réalisme du mail (exigence maximale)."),
  humanDetectorPassed: z.boolean().describe("True si le mail est totalement indifférenciable d'un e-mail rédigé à la main par une consultante senior et ne contient AUCUN cliché IA ni buzzword.")
});

type EmailDraftResponse = z.infer<typeof EmailDraftSchema>;

export class CreativeCopywriter extends AutonomousAgent {
  constructor() {
    super(
      "Creative Copywriter",
      {
        role: [
          "Tu es Manon Verhoeven, responsable de la rédaction d'approche B2B chez Purity Agency.",
          "Tu n'es pas une commerciale, pas une démarcheuse et tu n'utilises AUCUN jargon de vendeur ou de prompt IA.",
          "Purity Agency ne vend pas QUE des sites web : présence en ligne, acquisition (SEO/Ads), automatisation & IA, outils métier (CRM), studio créatif, hébergement. Ton unique mission est d'observer le VRAI problème du quotidien de ce dirigeant précis — pas de partir par défaut sur \"votre site est lent\" — et d'ouvrir une conversation sobre et crédible avec un dirigeant de PME en Belgique (Wallonie/Bruxelles).",
          "Chaque message doit donner l'impression exacte d'avoir été rédigé individuellement par une experte qui a étudié le dossier de l'entreprise avant d'écrire."
        ].join(' '),
        department: "01_ACQUISITION",
        knowledgeFiles: [
          "PurityVoiceProfile.md",
          "BrandRules.md",
          "ForbiddenWords.md",
          "purity_catalogue_officiel_v2.md"
        ],
        skills: [
          "brand-voice",
          "email-ops",
          "lead-intelligence",
          "agentic-engineering",
          "prompt-optimizer",
          "karpathy-guidelines"
        ]
      }
    );
  }

  public async draftEmail(leadId: string, customTone?: string, regeneratingDraftId?: string): Promise<string | null> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { mission: { select: { parameters: true } } } });

    if (!lead || (lead.status !== 'ENRICHED' && !regeneratingDraftId)) {
      await this.logger.logError(`Lead non valide ou pas encore ENRICHED: ${leadId}`);
      return null;
    }

    await this.logger.startTask(`Rédaction du message sur-mesure pour ${lead.companyName} (Manon Verhoeven)`);

    try {
      // Même moteur que la fiche d'appel et la fiche prospect (salesKit.ts) —
      // l'angle le plus pertinent pour CE prospect, pas systématiquement le
      // site web. Zéro coût, zéro latence (déterministe).
      const sector = sectorFromMissionParameters(lead.mission?.parameters);
      const kit = buildSalesKit(buildLeadKitInput(lead, sector));
      const primaryAngle = kit.angles[0];
      const secondaryAngle = kit.angles[1];
      // 2 leviers de persuasion parmi ceux déjà calculés pour ce prospect
      // (aversion à la perte + preuve sociale/ancrage) — reformulés pour un
      // COLD EMAIL très court, pas pour un script d'appel.
      const lossAversion = kit.psychology.find((p) => p.name === "Aversion à la perte")?.example ?? "";
      const specificityAnchor = kit.psychology.find((p) => p.name === "Ancrage par la donnée précise")?.example ?? "";

      const contactFirstName = lead.contactName ? lead.contactName.split(' ')[0] : "";

      const prompt = `
        Dossier du prospect :
        - Entreprise : ${lead.companyName}
        - Secteur : ${sector || "PME/indépendant"}
        - Localisation : ${lead.location || "Wallonie"}
        - Site Web : ${lead.websiteUrl || "Aucun site recensé"}
        - Contact : ${lead.contactName || "Dirigeant(e)"} (${lead.contactRole || "Direction"})
        - Profil décisionnel estimé : ${kit.archetype.label} — convaincu par : ${kit.archetype.convinces.join(", ")} ; déteste : ${kit.archetype.hates.join(", ")}

        ANGLE PRINCIPAL POUR CE PROSPECT (ne pars PAS par défaut sur "site web" si un autre angle est mieux noté) :
        - Porte d'entrée : ${primaryAngle.label}
        - Problème du quotidien probable : ${primaryAngle.dailyPain}
        - Angle de repli si besoin : ${secondaryAngle.label} — ${secondaryAngle.dailyPain}
        - Service Purity pertinent (à évoquer SANS le nommer par son code, SANS prix) : ${kit.serviceRecommendation.primary.label}

        LEVIERS DE PERSUASION À TON SERVICE (t'en inspirer, ne pas les citer littéralement — c'est de la matière, pas un script à copier) :
        - Aversion à la perte : ${lossAversion}
        - Ancrage par la précision : ${specificityAnchor}

        DIRECTIVES DE RÉDACTION — MANON VERHOEVEN (QUALITÉ ÉLITE B2B) :

        1. TON & STYLE :
           - Vouvoiement professionnel strict (B2B Belgique/Wallonie/Bruxelles), calibré sur le profil décisionnel ci-dessus (ce qu'il déteste = interdit absolu).
           - Sobriété, précision, respect du temps du dirigeant.
           - Style concis : entre 40 et 80 mots maximum dans le corps.
           - AUCUN mot de bonimenteur, aucun enthousiasme artificiel ("Ravi de vous contacter", "Formidable entreprise").

        2. BANNIÈRE ABSOLUE DES JARGONS ET CLICHÉS IA (FAUTE GRAVE) :
           - INTERDICTION du terme "Liquid Glass", "IA", "AI Slot", "Pattern Interrupt", "Booster", "Révolutionnaire", "Plongez dans".
           - INTERDICTION des formules creuses : "Dans le monde d'aujourd'hui", "J'espère que vous allez bien", "N'hésitez pas à me recontacter".
           - INTERDICTION des salutations génériques déplacées ("Bonjour Monsieur", "Bonjour Madame, Monsieur").
           - Si le nom du contact est connu ("${contactFirstName}"), utilise "Bonjour ${contactFirstName}". Si le nom est INCONNU ou générique, commence directement par la constatation factuelle sans politesse artificielle.

        3. STRUCTURE DU MESSAGE (ACCROCHE FACTUELLE + IMPACT + CTA CONCRET), ANCRÉE SUR L'ANGLE PRINCIPAL CI-DESSUS :
           - Accroche : Rentre immédiatement dans le sujet avec un fait ou une observation liée à L'ANGLE PRINCIPAL (pas systématiquement la vitesse du site — utilise le vrai problème identifié : automatisation, acquisition, outils métier, visuels, hébergement...).
           - Conséquence concrète : Explique l'impact en termes simples et réalistes, dérivé du "problème du quotidien probable" ci-dessus.
           - Proposition à faible friction (CTA) : Propose une étape simple sans engagement (ex: "Si vous le souhaitez, je peux vous faire parvenir la synthèse en PDF", "Souhaitez-vous qu'on consacre 10 minutes à passer en revue ce point ?").

        4. SÉCURITÉ ET INTÉGRITÉ DES DONNÉES (ZÉRO PLACEHOLDER) :
           - AUCUN prix en euros (pas de "490 €", "1 490 €"). Le premier mail ne vend rien et ne chiffre rien.
           - AUCUN code interne de module ("M01", "M04").
           - AUCUN crochet ou champ de gabarit ([Nom], {{name}}, [Entreprise], [Lien]). Le texte doit être 100% prêt à l'envoi.
           - AUCUNE mention d'image, capture d'écran, pièce jointe ou lien "ci-joint".

        FORMAT DE SORTIE REQUIS (ZOD SCHEMA) :
        1. objectionPrediction : Analyse de l'objection probable du dirigeant.
        2. subject : Objet clair, court, factuel, cohérent avec l'angle principal (ex: "Temps d'affichage mobile — ${lead.companyName}", "Rendez-vous manqués — ${lead.companyName}").
        3. bodyHtml : Texte rédigé en HTML propre (<p>, <br>).
        4. selfCritique : Ta propre critique sévère du mail — répond-il vraiment au bon problème pour CE prospect ?
        5. selfCritiqueScore : Note sur 10.
        6. humanDetectorPassed : true uniquement si le mail est d'un réalisme irréprochable.
      `;

      let result = await this.think<EmailDraftResponse>(prompt, "Rédaction par Manon Verhoeven (Essai 1)", EmailDraftSchema);

      let attempts = 1;
      // COÛT : plafond de réécritures ramené de 3 à 2 (max 3 générations au lieu
      // de 4). Le garde-fou déterministe (placeholder/code/prix) reste, et 2
      // essais suffisent au modèle pour corriger — le 4e appel était surtout du
      // gaspillage. Le filet stripPlaceholders + "ne pas créer si interdit"
      // garantit qu'aucun brouillon non conforme ne passe malgré la baisse.
      while (
        (!result.humanDetectorPassed || result.selfCritiqueScore < 8 || containsPlaceholder(result.bodyHtml)) &&
        attempts <= 2
      ) {
        const forbidden = describeForbidden(result.bodyHtml);
        await this.logger.startTask(
          forbidden
            ? `Le texte contient un élément non conforme (${forbidden}). Réécriture forcée...`
            : `Note de qualité insuffisante (${result.selfCritiqueScore}/10). Réécriture approfondie par Manon...`
        );

        const retryPrompt = `${prompt}\n\nAttention : Ta précédente proposition a été rejetée pour la raison suivante : "${result.selfCritique}". ${
          forbidden ? `Élément interdit détecté : ${forbidden}.` : ''
        }\n\nRéécris une version encore plus sobre, directe et crédible, en éliminant toute tournure artificielle.`;

        result = await this.think<EmailDraftResponse>(retryPrompt, `Rédaction par Manon Verhoeven (Essai ${attempts + 1})`, EmailDraftSchema);
        attempts++;
      }

      if (containsPlaceholder(result.bodyHtml)) {
        result.bodyHtml = stripPlaceholders(result.bodyHtml);
      }

      const stillForbidden = describeForbidden(result.bodyHtml);
      if (stillForbidden && !regeneratingDraftId) {
        await this.logger.logError(
          `Brouillon non validé pour ${lead.companyName} : motif (${stillForbidden}). Le lead reste ENRICHED.`,
        );
        return null;
      }

      const draftTone = customTone || "Manon Verhoeven — Audit & Accroche Sur-Mesure";

      if (regeneratingDraftId) {
        await prisma.emailDraft.update({
          where: { id: regeneratingDraftId },
          data: {
            subject: result.subject,
            bodyHtml: result.bodyHtml,
            tone: draftTone,
            status: "PENDING_APPROVAL"
          }
        });
        await this.logger.finishTask(`Brouillon B2B réécrits par Manon Verhoeven pour ${lead.companyName}.`);
        return regeneratingDraftId;
      } else {
        const createdDraft = await prisma.emailDraft.create({
          data: {
            leadId: lead.id,
            subject: result.subject,
            bodyHtml: result.bodyHtml,
            tone: draftTone,
            status: "PENDING_APPROVAL"
          }
        });

        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: 'DRAFTED' }
        });

        await this.logger.finishTask(`Brouillon B2B rédigé avec succès par Manon Verhoeven pour ${lead.companyName} (Note: ${result.selfCritiqueScore}/10).`);
        return createdDraft.id;
      }

    } catch (error) {
      await this.logger.logError(`Échec de la rédaction par Manon Verhoeven pour le lead ${leadId}: ${error}`);
      throw error;
    }
  }

  /**
   * Rédige une réponse à une réponse ENTRANTE d'un prospect (boucle fermée du
   * pôle Ventes/Communication). Grounded STRICTEMENT sur ce que le prospect a
   * réellement écrit (replyText) — Manon ne répond jamais à côté, n'invente
   * jamais une question que le prospect n'a pas posée. Mêmes garde-fous que
   * draftEmail (zéro placeholder, zéro jargon), sauf que le prix PEUT être
   * mentionné si — et seulement si — le prospect l'a explicitement demandé.
   */
  public async draftReply(leadId: string, replyText: string, replySubject: string): Promise<string | null> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { mission: { select: { parameters: true } } } });
    if (!lead) {
      await this.logger.logError(`Lead introuvable pour draftReply: ${leadId}`);
      return null;
    }

    await this.logger.startTask(`Réponse à ${lead.companyName} suite à sa réponse (Manon Verhoeven)`);

    try {
      const sector = sectorFromMissionParameters(lead.mission?.parameters);
      const kit = buildSalesKit(buildLeadKitInput(lead, sector));
      const contactFirstName = lead.contactName ? lead.contactName.split(' ')[0] : "";
      const mentionsPrice = /prix|tarif|co(u|û)te|budget|combien/i.test(replyText);

      const prompt = `
        Le prospect ${lead.companyName} (${lead.contactName || "contact inconnu"}) vient de RÉPONDRE à notre premier message.

        Voici EXACTEMENT ce qu'il a écrit (objet : "${replySubject}") :
        """${replyText.slice(0, 3000)}"""

        Profil décisionnel estimé : ${kit.archetype.label} — convaincu par : ${kit.archetype.convinces.join(", ")} ; déteste : ${kit.archetype.hates.join(", ")}.

        DIRECTIVES DE RÉPONSE — MANON VERHOEVEN :
        1. Réponds PRÉCISÉMENT à ce que le prospect a écrit — ne reformule pas un pitch générique, ne pose pas une question qu'il a déjà répondue.
        2. Vouvoiement, sobriété, 40 à 90 mots maximum. Calibre le ton sur le profil décisionnel ci-dessus (ce qu'il déteste = interdit absolu).
        3. Si le nom est connu ("${contactFirstName}"), "Bonjour ${contactFirstName}".
        4. ${mentionsPrice
          ? "Le prospect demande explicitement un prix ou un budget : tu PEUX indiquer que nos formules démarrent à 490€ pour un premier module, sans détailler le catalogue complet — propose plutôt un appel de 15-20 minutes pour cadrer précisément son besoin."
          : "AUCUN prix, aucun montant : le prospect n'a rien demandé de tel."}
        5. Termine par une proposition concrète à faible friction (créneau d'appel, envoi d'un document) — jamais vague ("n'hésitez pas à revenir vers moi").
        6. Interdits absolus (faute grave) : jargon IA, placeholders ([Nom], {{x}}), clichés commerciaux, code module interne (MXX).

        FORMAT DE SORTIE (ZOD SCHEMA) :
        1. objectionPrediction : la vraie objection/question restante après cette réponse (peut être "aucune" si le prospect a l'air prêt à avancer).
        2. subject : reprends "Re: ${replySubject}" ou un objet court cohérent.
        3. bodyHtml : la réponse en HTML propre (<p>, <br>).
        4. selfCritique : critique sévère — répond-elle VRAIMENT à ce qui a été écrit ?
        5. selfCritiqueScore : note sur 10.
        6. humanDetectorPassed : true uniquement si irréprochable.
      `;

      let result = await this.think<EmailDraftResponse>(prompt, "Réponse par Manon Verhoeven (Essai 1)", EmailDraftSchema);

      let attempts = 1;
      while (
        (!result.humanDetectorPassed || result.selfCritiqueScore < 8 || containsPlaceholder(result.bodyHtml)) &&
        attempts <= 2
      ) {
        const forbidden = describeForbidden(result.bodyHtml);
        const retryPrompt = `${prompt}\n\nAttention : Ta précédente proposition a été rejetée : "${result.selfCritique}". ${
          forbidden ? `Élément interdit détecté : ${forbidden}.` : ''
        }\n\nRéécris une version plus précise et directement ancrée dans ce que le prospect a écrit.`;
        result = await this.think<EmailDraftResponse>(retryPrompt, `Réponse par Manon Verhoeven (Essai ${attempts + 1})`, EmailDraftSchema);
        attempts++;
      }

      let body = result.bodyHtml;
      if (containsPlaceholder(body)) body = stripPlaceholders(body);
      const stillForbidden = describeForbidden(body);
      if (stillForbidden) {
        await this.logger.logError(`Réponse non validée pour ${lead.companyName} : motif (${stillForbidden}).`);
        return null;
      }

      const createdDraft = await prisma.emailDraft.create({
        data: {
          leadId: lead.id,
          subject: result.subject,
          bodyHtml: body,
          tone: "Manon Verhoeven — Réponse à réponse entrante",
          status: "PENDING_APPROVAL",
        },
      });

      await this.logger.finishTask(`Réponse préparée pour ${lead.companyName} (note ${result.selfCritiqueScore}/10) — à valider.`);
      return createdDraft.id;
    } catch (error) {
      await this.logger.logError(`Échec draftReply pour ${leadId}: ${error}`);
      return null;
    }
  }

  public async draftFollowUp(leadId: string, followUpIndex: number): Promise<string | null> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { mission: { select: { parameters: true } } } });
    if (!lead || (lead.status !== 'CONTACTED' && lead.status !== 'DRAFTED')) {
      await this.logger.logError(`Lead non éligible à la relance: ${leadId}`);
      return null;
    }

    await this.logger.startTask(`Rédaction relance #${followUpIndex} pour ${lead.companyName} (Manon Verhoeven)`);

    try {
      const sector = sectorFromMissionParameters(lead.mission?.parameters);
      const kit = buildSalesKit(buildLeadKitInput(lead, sector));
      const primaryAngle = kit.angles[0];

      const prompt = `
        Tu rédiges une relance sobre (Relance #${followUpIndex}) pour "${lead.companyName}".

        Destinataire : ${lead.contactName || "Dirigeant"} (${lead.companyName})
        Localisation : ${lead.location || "Wallonie"}
        Profil décisionnel estimé : ${kit.archetype.label} — déteste : ${kit.archetype.hates.join(", ")}
        Ce qu'on avait évoqué dans le 1er message (l'angle réel de CE prospect, pas un exemple générique) : ${primaryAngle.dailyPain}

        DIRECTIVES DE RELANCE — MANON VERHOEVEN :
        - Ultra-court : 25 à 45 mots maximum.
        - Ton : Sobriété absolue, aucun reproche, pas de relance agressive.
        - Reformule le rappel en te basant sur "l'angle réel" ci-dessus (JAMAIS un exemple générique de vitesse de site si ce n'est pas l'angle de CE prospect) : "Je me permettais simplement de vérifier si vous aviez pu jeter un œil à ma précédente remarque concernant [le vrai sujet]."
        - Pas de cliché IA, pas de prix, pas de placeholder.
      `;

      const result = await this.think<EmailDraftResponse>(prompt, `Relance #${followUpIndex} Manon Verhoeven`, EmailDraftSchema);

      let body = result.bodyHtml;
      if (containsPlaceholder(body)) {
        body = stripPlaceholders(body);
      }

      const createdDraft = await prisma.emailDraft.create({
        data: {
          leadId: lead.id,
          subject: result.subject || `Suite — ${lead.companyName}`,
          bodyHtml: body,
          tone: `Manon Verhoeven — Relance #${followUpIndex}`,
          status: "PENDING_APPROVAL"
        }
      });

      return createdDraft.id;
    } catch (err) {
      await this.logger.logError(`Échec relance pour ${leadId}: ${err}`);
      return null;
    }
  }
}
