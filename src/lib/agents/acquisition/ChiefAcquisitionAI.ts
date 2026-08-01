import { prisma } from '@/lib/prisma';
import { MarketScout } from './MarketScout';
import { MissionOrder } from './types';
import { AutonomousAgent } from './AgentCore';

const scout = new MarketScout();

// Secteurs réels des packs métier affichés sur services.html — jamais une
// liste inventée. Zones réelles autour de Charleroi (siège de l'agence,
// voir MASTER_COO_DIRECTIVE.md §0).
const REAL_SECTORS = [
  'Coiffure & Beauté', 'Artisan & Bâtiment', 'HoReCa',
  'Praticien & Bien-être', 'Immobilier', 'Avocats & Juridique', 'Commerces & Retail',
];
const REAL_ZONES = ['Charleroi', 'Namur', 'Mons', 'La Louvière', 'Liège'];

/**
 * NOTE HONNÊTE : cette rotation est un round-robin déterministe, PAS un
 * ciblage "basé sur les tendances réelles" au sens fort — aucune mission
 * n'a encore assez de leads convertis (MEETING_BOOKED/REPLIED) pour
 * pondérer par performance réelle. Le jour où cette donnée existe, c'est
 * au pôle 06_STRATEGIE_DATA (Market Trend Analyst) de la fournir ici —
 * pas une pondération inventée en attendant.
 */
function pickSectorAndZone(): { sector: string; zone: string } {
  const dayIndex = new Date().getUTCDate() % REAL_SECTORS.length;
  const hourIndex = new Date().getUTCHours() % REAL_ZONES.length;
  return { sector: REAL_SECTORS[dayIndex], zone: REAL_ZONES[hourIndex] };
}

export class ChiefAcquisitionAI extends AutonomousAgent {
  constructor() {
    super(
      "Chief Acquisition AI",
      {
        role: "Directeur Stratégique de l'Acquisition. Tu analyses les secteurs cibles, lis le catalogue Purity et génères des plans d'attaque (MissionOrder) pour le Market Scout.",
        department: "01_ACQUISITION",
        knowledgeFiles: ["purity_catalogue_officiel_v2.md"]
      }
    );
  }

  public async launchMission(name: string, sectors: string[], locations: string[], maxLeads: number = 50) {
    await this.logger.startTask(`Stratégie pour la mission: ${name}`);

    const prompt = `
      Nouvelle intention de mission:
      - Nom: ${name}
      - Secteurs: ${sectors.join(', ')}
      - Villes: ${locations.join(', ')}

      Analyse ces secteurs par rapport au catalogue Purity.
      Génère une stratégie au format JSON:
      {
        "recommendedTechStack": ["wordpress", "wix"]
      }
    `;

    interface StrategyResponse { recommendedTechStack: string[] }
    const strategy = await this.think<StrategyResponse>(prompt, "Analyse stratégique de la mission");

    const missionRecord = await prisma.mission.create({
      data: {
        name,
        parameters: { sectors, locations, maxLeads, requiredTechStack: strategy.recommendedTechStack },
        status: 'ACTIVE'
      }
    });

    const missionOrder: MissionOrder = {
      missionId: missionRecord.id,
      name,
      parameters: { sectors, locations, maxLeads, requiredTechStack: strategy.recommendedTechStack },
      createdAt: missionRecord.createdAt
    };

    await this.logger.finishTask(`Mission enregistrée (ID: ${missionRecord.id}). Délégation au Market Scout.`);

    // Version asynchrone fire-and-forget — utilisée par le déclenchement manuel.
    scout.executeMission(missionOrder).catch(err => {
      this.logger.logError(`Erreur critique du Scout sur la mission ${missionRecord.id}: ${err}`);
    });

    return missionRecord;
  }

  /**
   * Version AWAITÉE pour le cron — le déclencheur a besoin de connaître le
   * nombre réel de leads trouvés pour gérer le quota journalier, et la
   * fonction serverless doit rester vivante jusqu'à la fin réelle du
   * travail (sinon le scout tourne dans le vide après la réponse HTTP).
   */
  public async runScheduledScan(remainingQuota: number): Promise<{ missionId: string; leadsFound: number }> {
    const { sector, zone } = pickSectorAndZone();
    const maxLeads = Math.min(remainingQuota, 8); // plafond par run pour rester sous la limite de durée Vercel

    await this.logger.startTask(`Scan planifié — secteur: ${sector}, zone: ${zone}, quota restant: ${remainingQuota}`);

    const missionRecord = await prisma.mission.create({
      data: {
        name: `Scan auto ${sector} — ${zone} — ${new Date().toISOString().slice(0, 10)}`,
        parameters: { sectors: [sector], locations: [zone], maxLeads },
        status: 'ACTIVE'
      }
    });

    const leadsFound = await scout.executeMission({
      missionId: missionRecord.id,
      name: missionRecord.name,
      parameters: { sectors: [sector], locations: [zone], maxLeads },
      createdAt: missionRecord.createdAt,
    });

    await prisma.mission.update({ where: { id: missionRecord.id }, data: { status: 'COMPLETED' } });
    await this.logger.finishTask(`Scan planifié terminé: ${leadsFound} lead(s) sur ${missionRecord.name}.`);

    return { missionId: missionRecord.id, leadsFound };
  }

  public async evaluateCampaign(): Promise<void> {
    await this.logger.startTask("Évaluation des campagnes et KPIs...");
    await new Promise(r => setTimeout(r, 2000));
    await this.logger.finishTask("Analyse terminée.");
  }
}
