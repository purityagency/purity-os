import { AutonomousAgent } from '../acquisition/AgentCore';
import { z } from 'zod';

const RevenueForecastSchema = z.object({
  projectedRevenueNextQuarter: z.number(),
  confidenceInterval: z.number().min(0).max(100),
  growthDrivers: z.array(z.string()),
});

export class BIRevenueForecaster extends AutonomousAgent {
  constructor() {
    super("BI & Revenue Forecaster", {
      role: [
        "Tu es Gilles Vanhoof, Analyste Prévisions & KPIs Agence.",
        "Tu utilises les données historiques de vente et de production",
        "pour prédire le chiffre d'affaires du trimestre suivant.",
        "Tes prévisions doivent être prudentes et data-driven."
      ].join(' '),
      department: "06_STRATEGIE_DATA",
    });
  }

  public async forecastRevenue(historicalData: string): Promise<z.infer<typeof RevenueForecastSchema> | null> {
    await this.logger.startTask("Prévision des revenus du prochain trimestre");

    try {
      const prompt = `
        Voici les données historiques de revenus des 12 derniers mois et le pipeline actuel :
        """${historicalData}"""

        Calcule une projection réaliste du revenu pour le trimestre prochain.
        Indique ton intervalle de confiance (%) et liste les moteurs de croissance
        qui permettront d'atteindre ce chiffre.
      `;

      const forecast = await this.think<z.infer<typeof RevenueForecastSchema>>(
        prompt,
        "Analyse prédictive (BI)",
        RevenueForecastSchema
      );

      await this.logger.finishTask(`Forecast terminé. Projeté: ${forecast.projectedRevenueNextQuarter}€ (Confiance: ${forecast.confidenceInterval}%)`);
      return forecast;
    } catch (error) {
      await this.logger.logError(`Échec du forecast de revenus: ${error}`);
      return null;
    }
  }
}


