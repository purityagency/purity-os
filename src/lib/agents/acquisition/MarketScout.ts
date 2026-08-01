import { MissionOrder } from './types';
import Exa from 'exa-js';
import { prisma } from '@/lib/prisma';
import { AutonomousAgent } from './AgentCore';
import { IntelligenceAnalyst } from './IntelligenceAnalyst';
import { CreativeCopywriter } from './CreativeCopywriter';
import { LeadScoringAnalyst } from './LeadScoringAnalyst';

const exa = new Exa(process.env.EXA_API_KEY || "dummy_key");
const analyst = new IntelligenceAnalyst();
const copywriter = new CreativeCopywriter();
const scorer = new LeadScoringAnalyst();

export class MarketScout extends AutonomousAgent {
  constructor() {
    super(
      "Market Scout",
      {
        role: "Spécialiste OSINT et Web Scraping. Tu formules les meilleures requêtes de recherche pour dénicher des prospects hyper-qualifiés et tu filtres le bruit.",
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

    try {
      const prompt = `
        Génère une liste de requêtes de recherche Exa optimales pour trouver des entreprises correspondantes à cette mission:
        - Secteurs: ${order.parameters.sectors.join(', ')}
        - Villes: ${order.parameters.locations.join(', ')}
        - Tech requise: ${order.parameters.requiredTechStack?.join(', ') || 'N/A'}

        Sors les résultats sous forme JSON:
        {
          "queries": ["requête 1", "requête 2"]
        }
      `;

      interface SearchStrategy { queries: string[] }
      const strategy = await this.think<SearchStrategy>(prompt, "Formulation des requêtes de chasse");

      for (const query of strategy.queries) {
        if (leadsFound >= order.parameters.maxLeads) break;

        await this.logger.startTask(`Recherche Exa: "${query}"`);

        const searchResponse = await exa.searchAndContents(query, {
          type: "neural",
          useAutoprompt: true,
          numResults: 5,
          text: true
        });

        for (const result of searchResponse.results) {
          if (leadsFound >= order.parameters.maxLeads) break;

          const evalPrompt = `
            Voici un site trouvé par recherche:
            - Titre: ${result.title}
            - URL: ${result.url}
            - Extrait: ${result.text?.substring(0, 300)}

            Ce site est-il un bon lead potentiel pour les secteurs ${order.parameters.sectors.join(', ')} ?
            {
              "isGoodLead": true/false,
              "companyName": "Nom de l'entreprise extrait",
              "reason": "Pourquoi ?"
            }
          `;

          interface EvalResponse { isGoodLead: boolean; companyName: string; reason: string; }
          const evaluation = await this.think<EvalResponse>(evalPrompt, `Évaluation rapide de ${result.url}`);

          if (evaluation.isGoodLead) {
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
                companyName: evaluation.companyName || result.title?.split('-')[0]?.trim() || result.url,
                websiteUrl: result.url,
                location: order.parameters.locations[0],
                source: 'EXA',
                status: 'NEW'
              }
            });

            leadsFound++;
            await this.logger.finishTask(`Lead qualifié: ${evaluation.companyName} (${evaluation.reason})`);

            // Chaîne automatiquement vers l'audit puis le brouillon d'email.
            // S'arrête volontairement à DRAFTED (PENDING_APPROVAL) — aucun
            // agent de ce pôle n'envoie un email sans validation humaine.
            try {
              await analyst.analyzeLead(leadRecord.id);
              await copywriter.draftEmail(leadRecord.id);
              await scorer.scoreLead(leadRecord.id);
            } catch (chainError) {
              await this.logger.logError(
                `Chaîne Analyst→Copywriter→Scoring interrompue pour ${leadRecord.companyName}: ${chainError}`
              );
            }
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
