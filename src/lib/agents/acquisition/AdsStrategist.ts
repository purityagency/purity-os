import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { AutonomousAgent } from './AgentCore';

const CampaignBriefSchema = z.object({
  headline: z.string(),
  primaryText: z.string(),
  targetingNotes: z.string(),
});
type CampaignBrief = z.infer<typeof CampaignBriefSchema>;

export class AdsStrategist extends AutonomousAgent {
  constructor() {
    super(
      'Ads Strategist',
      {
        role: "Tu es Sofia Marchetti, Ads Strategist du pôle Acquisition de Purity Agency. Tu proposes des campagnes Meta Ads ou Google Ads calibrées sur un budget de diffusion réel — jamais en dessous du minimum recommandé par le catalogue officiel. Tu définis un seuil d'arrêt avant le lancement, jamais après.",
        department: '01_ACQUISITION',
      }
    );
  }

  public getMinimumMonthlyBudget(): number {
    const sitePath = path.join(process.cwd(), '../purity-agency-site/services.html');
    let html: string;
    try {
      html = fs.readFileSync(sitePath, 'utf8');
    } catch {
      throw new Error(
        `[AdsStrategist] Impossible de lire ${sitePath} pour extraire le budget plancher réel.`
      );
    }

    const match = html.match(/[Bb]udget diffusion minimum recommand[ée][^\d]{0,20}(\d+)\s*(?:&nbsp;)?€/);
    if (!match) {
      throw new Error(
        '[AdsStrategist] Le texte "Budget diffusion minimum recommandé" est introuvable dans services.html.'
      );
    }

    return Number(match[1]);
  }

  public async buildCampaignBrief(sector: string, painPoint: string): Promise<CampaignBrief> {
    const minBudget = this.getMinimumMonthlyBudget();
    await this.logger.startTask(`Brief de campagne pour secteur ${sector} (budget plancher réel: ${minBudget}€/mois)`);

    const prompt = `
      Rédige un brief de campagne publicitaire courte pour le secteur "${sector}",
      ciblant des entreprises qui souffrent de ce point de douleur : "${painPoint}".
      Budget de diffusion réel disponible : ${minBudget}€/mois minimum (source: catalogue officiel).

      Produis : headline, primaryText, targetingNotes.
    `;

    const brief = await this.think<CampaignBrief>(prompt, 'Génération du brief créatif', CampaignBriefSchema);
    await this.logger.finishTask(`Brief prêt pour ${sector} — validation CEO requise avant tout lancement.`);
    return brief;
  }

  public async launchCampaign(_brief: CampaignBrief, _budget: number): Promise<never> {
    throw new Error(
      "[AdsStrategist] Aucune clé Meta Ads / Google Ads dans secrets/ — impossible de lancer une campagne réelle."
    );
  }
}
