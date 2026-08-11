import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { AutonomousAgent } from './AgentCore';
import { containsPlaceholder, stripPlaceholders, describeForbidden } from '@/lib/emailPlaceholders';

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
          "Ton unique mission est d'observer un fait réel (audit technique, visibilité locale, vitesse mobile) et d'ouvrir une conversation sobre et crédible avec un dirigeant de PME en Belgique (Wallonie/Bruxelles).",
          "Chaque message doit donner l'impression exacte d'avoir été rédigé individuellement par une experte qui a étudié le dossier de l'entreprise avant d'écrire."
        ].join(' '),
        department: "01_ACQUISITION",
        knowledgeFiles: [
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
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });

    if (!lead || (lead.status !== 'ENRICHED' && !regeneratingDraftId)) {
      await this.logger.logError(`Lead non valide ou pas encore ENRICHED: ${leadId}`);
      return null;
    }

    await this.logger.startTask(`Rédaction du message sur-mesure pour ${lead.companyName} (Manon Verhoeven)`);

    try {
      interface AuditData {
        painPoints?: string[]
        recommendedModules?: string[]
        performanceScore?: number | null
        seoScore?: number | null
        contactPhone?: string | null
        seoAudit?: { competitorName?: string; competitorGap?: string } | null
        gmbRating?: number | null
        gmbReviewCount?: number | null
      }
      const auditData = (lead.auditData as AuditData | null) || {};
      const painPoints = auditData.painPoints?.length
        ? auditData.painPoints.join("; ")
        : "Vitesse d'affichage mobile et visibilité locale à optimiser";

      const perfScore = auditData.performanceScore != null ? `${auditData.performanceScore}/100` : "Non mesuré";
      const gmbInfo = auditData.gmbRating ? `Note GMB: ${auditData.gmbRating}/5 (${auditData.gmbReviewCount || 0} avis)` : "Non analysé";
      const competitorGap = auditData.seoAudit?.competitorName
        ? `Concurrent local mieux positionné : ${auditData.seoAudit.competitorName}`
        : "Pas de concurrent direct identifié dans l'audit";

      const contactFirstName = lead.contactName ? lead.contactName.split(' ')[0] : "";

      const prompt = `
        Dossier du prospect :
        - Entreprise : ${lead.companyName}
        - Localisation : ${lead.location || "Wallonie"}
        - Site Web : ${lead.websiteUrl || "Aucun site recensé"}
        - Contact : ${lead.contactName || "Dirigeant(e)"} (${lead.contactRole || "Direction"})
        - Audit Technique / Performance : ${perfScore}
        - Fiche Google Business : ${gmbInfo}
        - Concurrent local : ${competitorGap}
        - Anomalies & Points d'attention relevés : ${painPoints}

        DIRECTIVES DE RÉDACTION — MANON VERHOEVEN (QUALITÉ ÉLITE B2B) :

        1. TON & STYLE :
           - Vouvoiement professionnel strict (B2B Belgique/Wallonie/Bruxelles).
           - Sobriété, précision, respect du temps du dirigeant.
           - Style concis : entre 40 et 80 mots maximum dans le corps.
           - AUCUN mot de bonimenteur, aucun enthousiasme artificiel ("Ravi de vous contacter", "Formidable entreprise").

        2. BANNIÈRE ABSOLUE DES JARGONS ET CLICHÉS IA (FAUTE GRAVE) :
           - INTERDICTION du terme "Liquid Glass", "IA", "AI Slot", "Pattern Interrupt", "Booster", "Révolutionnaire", "Plongez dans".
           - INTERDICTION des formules creuses : "Dans le monde d'aujourd'hui", "J'espère que vous allez bien", "N'hésitez pas à me recontacter".
           - INTERDICTION des salutations génériques déplacées ("Bonjour Monsieur", "Bonjour Madame, Monsieur").
           - Si le nom du contact est connu ("${contactFirstName}"), utilise "Bonjour ${contactFirstName}". Si le nom est INCONNU ou générique, commence directement par la constatation factuelle sans politesse artificielle.

        3. STRUCTURE DU MESSAGE (ACCROCHE FACTUELLE + IMPACT + CTA CONCRET) :
           - Accroche : Rentre immédiatement dans le sujet avec un fait précis issu de l'audit (ex: "En analysant les performances du site de ${lead.companyName} sur smartphone...", "En consultant votre fiche d'établissement à ${lead.location || 'votre région'}...").
           - Conséquence concrète : Explique l'impact en termes simples et réalistes (perte de demandes de devis sur mobile, prospects redirigés vers des concurrents mieux positionnés).
           - Proposition à faible friction (CTA) : Propose une étape simple sans engagement (ex: "Si vous le souhaitez, je peux vous faire parvenir la synthèse de l'audit en PDF", "Souhaitez-vous qu'on consacre 10 minutes à passer en revue ces 3 points ?").

        4. SÉCURITÉ ET INTÉGRITÉ DES DONNÉES (ZÉRO PLACEHOLDER) :
           - AUCUN prix en euros (pas de "490 €", "1 490 €"). Le premier mail ne vend rien et ne chiffre rien.
           - AUCUN code interne de module ("M01", "M04").
           - AUCUN crochet ou champ de gabarit ([Nom], {{name}}, [Entreprise], [Lien]). Le texte doit être 100% prêt à l'envoi.
           - AUCUNE mention d'image, capture d'écran, pièce jointe ou lien "ci-joint".

        FORMAT DE SORTIE REQUIS (ZOD SCHEMA) :
        1. objectionPrediction : Analyse de l'objection probable du dirigeant.
        2. subject : Objet clair, court, factuel (ex: "Temps d'affichage mobile — ${lead.companyName}").
        3. bodyHtml : Texte rédigé en HTML propre (<p>, <br>).
        4. selfCritique : Ta propre critique sévère du mail.
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

  public async draftFollowUp(leadId: string, followUpIndex: number): Promise<string | null> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || (lead.status !== 'CONTACTED' && lead.status !== 'DRAFTED')) {
      await this.logger.logError(`Lead non éligible à la relance: ${leadId}`);
      return null;
    }

    await this.logger.startTask(`Rédaction relance #${followUpIndex} pour ${lead.companyName} (Manon Verhoeven)`);

    try {
      const contactFirstName = lead.contactName ? lead.contactName.split(' ')[0] : "";

      const prompt = `
        Tu rédiges une relance sobre (Relance #${followUpIndex}) pour "${lead.companyName}".
        
        Destinataire : ${lead.contactName || "Dirigeant"} (${lead.companyName})
        Localisation : ${lead.location || "Wallonie"}
        
        DIRECTIVES DE RELANCE — MANON VERHOEVEN :
        - Ultra-court : 25 à 45 mots maximum.
        - Ton : Sobriété absolue, aucun reproche, pas de relance agressive.
        - Idée : "Je me permettais simplement de vérifier si vous aviez pu jeter un œil à ma précédente remarque concernant la version mobile du site de ${lead.companyName}."
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
