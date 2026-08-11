import { z } from 'zod';
import { MissionOrder } from './types';
import Exa from 'exa-js';
import { prisma } from '@/lib/prisma';
import { AutonomousAgent } from './AgentCore';
import { eventBus } from '@/core/events';
import { LeadCapturedEvent } from './events';

// Instanciation paresseuse — jamais au chargement du module. Un `new
// IntelligenceAnalyst()` au niveau module s'exécute dès qu'un outil (build
// Next.js, tsc, un test) IMPORTE ce fichier, même sans jamais appeler
// executeMission(). Comme AgentCore lève une erreur si GEMINI_API_KEY est
// absent (voir AgentCore.ts), ça faisait planter tout le build Vercel
// pendant la collecte statique des routes — pas une hypothèse, observé en
// prod le 2026-08-01 (voir plans/acquisition-pole-next-phase.md).
let _exa: Exa | undefined;


function getExa(): Exa {
  if (!_exa) {
    const exaApiKey = process.env.EXA_API_KEY;
    if (!exaApiKey) {
      throw new Error(
        '[MarketScout] EXA_API_KEY manquant — variable d\'environnement Vercel en production, ' +
        'purity-os/.env en local. Aucun repli silencieux sur une clé factice.'
      );
    }
    _exa = new Exa(exaApiKey);
  }
  return _exa;
}

const BLOCKED_AGGREGATOR_DOMAINS = [
  'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com',
  'youtube.com', 'tiktok.com', 'pinterest.com',
  'pagesjaunes.be', 'goldenpages.be', 'resto.be', 'tripadvisor.be', 'tripadvisor.com',
  'booking.com', 'airbnb.com', 'takeaway.com', 'ubereats.com', 'deliveroo.be',
  'yelp.be', 'yelp.com', 'truvo.be', 'editus.lu', 'belgique-entreprises.be',
  'monitordecequi.be', 'ejustice.just.fgov.be', 'kbopub.economie.fgov.be',
  'wikipedia.org', 'amazon.com', 'ebay.com'
];

function isAggregatorDomain(urlStr: string): boolean {
  try {
    const hostname = new URL(urlStr).hostname.toLowerCase().replace(/^www\./, '');
    return BLOCKED_AGGREGATOR_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return true;
  }
}

const SearchStrategySchema = z.object({
  queries: z.array(z.string().min(3)).min(1),
});
type SearchStrategy = z.infer<typeof SearchStrategySchema>;

const EvalResponseSchema = z.object({
  isGoodLead: z.boolean(),
  companyName: z.string().min(1).nullable(),
  reason: z.string(),
});
type EvalResponse = z.infer<typeof EvalResponseSchema>;

export class MarketScout extends AutonomousAgent {
  constructor() {
    super(
      "Market Scout",
      {
        role: [
          "Tu es Léa Dumont, Market Scout du pôle Acquisition de Purity Agency.",
          "Méthodique, jamais pressée — tu considères qu'un lead mal vérifié coûte",
          "plus cher à l'agence qu'un lead en moins dans le quota du jour.",
          "Ta seule responsabilité : transformer les paramètres d'une mission",
          "(secteurs, zones, quota) en entreprises réelles et vérifiées. Tu ne",
          "confonds jamais un résultat de recherche brut avec un lead confirmé —",
          "un nom trouvé par recherche reste une piste tant qu'il n'a pas une",
          "URL réelle et cohérente avec le secteur demandé. Tu ne contactes",
          "jamais personne toi-même, tu ne fais que qualifier et transmettre.",
        ].join(' '),
        department: "01_ACQUISITION"
      }
    );
  }

  /** Nombre de leads déjà créés aujourd'hui, tous secteurs confondus — pour le quota journalier du cron. */
  public static async countLeadsToday(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return prisma.lead.count({ where: { createdAt: { gte: startOfDay } } });
  }

  public async executeMission(order: MissionOrder): Promise<number> {
    await this.logger.startTask(`Scan web pour la mission: ${order.name}`);
    let leadsFound = 0;
    let evaluationsUsed = 0;
    // Plafond dur, indépendant du nombre de leads trouvés — un lot de
    // résultats hors-cible ne doit jamais consommer un quota Gemini
    // illimité juste pour être rejeté (finding 2026-08-03, voir AgentCore).
    const MAX_EVALUATIONS_PER_RUN = 15;

    try {
      const prompt = `
        Génère une liste de requêtes de recherche Exa optimales pour trouver des entreprises correspondantes à cette mission:
        - Secteurs: ${order.parameters.sectors.join(', ')}
        - Villes: ${order.parameters.locations.join(', ')}
        - Tech requise: ${order.parameters.requiredTechStack?.join(', ') || 'N/A'}
      `;

      const strategy = await this.think<SearchStrategy>(
        prompt,
        "Formulation des requêtes de chasse",
        SearchStrategySchema
      );

      for (const query of strategy.queries) {
        if (leadsFound >= order.parameters.maxLeads) break;

        await this.logger.startTask(`Recherche Exa: "${query}"`);

        const searchResponse = await getExa().searchAndContents(query, {
          type: "neural",
          useAutoprompt: true,
          numResults: 5,
          text: true
        });

        for (const result of searchResponse.results) {
          if (leadsFound >= order.parameters.maxLeads) break;
          if (evaluationsUsed >= MAX_EVALUATIONS_PER_RUN) {
            await this.logger.finishTask(
              `Plafond de ${MAX_EVALUATIONS_PER_RUN} évaluations atteint — scan arrêté proprement (${leadsFound} lead(s) trouvé(s)).`
            );
            return leadsFound;
          }

          // Filtrage immédiat des annuaires et réseaux sociaux pour ne capturer que les vrais sites PME
          if (!result.url || isAggregatorDomain(result.url)) {
            await this.logger.finishTask(`Ignoré (annuaire/réseau social): ${result.url}`);
            continue;
          }

          evaluationsUsed++;

          const evalPrompt = `
            Voici un site trouvé par recherche:
            - Titre: ${result.title}
            - URL: ${result.url}
            - Extrait: ${result.text?.substring(0, 300)}

            Ce site est-il un bon lead potentiel pour les secteurs ${order.parameters.sectors.join(', ')} ?
            Si tu ne peux pas extraire un nom d'entreprise fiable, réponds companyName: null
            plutôt que d'inventer un nom.
          `;

          const evaluation = await this.think<EvalResponse>(
            evalPrompt,
            `Évaluation rapide de ${result.url}`,
            EvalResponseSchema
          );

          // Garde-fou code (pas seulement prompt) : un nom introuvable et
          // aucun titre exploitable = pas de lead, plutôt qu'un
          // `companyName` vide ou faux écrit en base (finding de l'audit
          // 2026-08-02 : ce cas n'était pas gardé avant).
          const companyName = evaluation.companyName || result.title?.split('-')[0]?.trim() || null;

          if (evaluation.isGoodLead && companyName) {
            const existing = result.url
              ? await prisma.lead.findFirst({ where: { websiteUrl: result.url } })
              : null;
            if (existing) {
              await this.logger.finishTask(`Doublon ignoré: ${result.url} déjà en base.`);
              continue;
            }

            const leadRecord = await prisma.lead.create({
              data: {
                missionId: order.missionId,
                companyName,
                websiteUrl: result.url,
                location: order.parameters.locations[0],
                source: 'EXA',
                status: 'NEW'
              }
            });

            leadsFound++;
            await this.logger.finishTask(`Lead qualifié: ${companyName} (${evaluation.reason})`);

            // Découplage de l'orchestration : émission de l'événement LeadCaptured
            eventBus.publish(new LeadCapturedEvent(leadRecord.id));
          } else if (!companyName) {
            await this.logger.finishTask(`Rejet: ${result.url} — aucun nom d'entreprise fiable extrait.`);
          } else {
            await this.logger.finishTask(`Rejet: ${result.url} - ${evaluation.reason}`);
          }
        }
      }

      await this.logger.finishTask(`Scan terminé. ${leadsFound} leads enregistrés au total.`);
      return leadsFound;

    } catch (error) {
      await this.logger.logError(`Erreur critique Exa API ou LLM: ${error}`);
      return leadsFound;
    }
  }
}
