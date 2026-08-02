import { prisma } from '@/lib/prisma';
import { AutonomousAgent } from './AgentCore';

export interface LeadScore {
  leadId: string;
  score: number;
  breakdown: { criterion: string; points: number; reason: string }[];
}

export class LeadScoringAnalyst extends AutonomousAgent {
  constructor() {
    super(
      'Lead Scoring Analyst',
      {
        role: "Tu es Yassine Bouzid, Lead Scoring Analyst du pôle Acquisition de Purity Agency. Tu notes chaque lead enrichi sur des critères vérifiables et documentés — jamais une intuition. Tu réévalues le score dès qu'une nouvelle donnée arrive.",
        department: '01_ACQUISITION',
      }
    );
  }

  public async scoreLead(leadId: string): Promise<LeadScore> {
    await this.logger.startTask(`Scoring du lead ${leadId}`);

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { mission: true } });
    if (!lead) {
      await this.logger.logError(`Lead introuvable: ${leadId}`);
      throw new Error(`Lead introuvable: ${leadId}`);
    }

    const breakdown: LeadScore['breakdown'] = [];
    let score = 0;

    if (lead.contactEmail) {
      score += 30;
      breakdown.push({ criterion: 'Contact vérifié', points: 30, reason: `Email confirmé: ${lead.contactEmail}` });
    } else {
      breakdown.push({ criterion: 'Contact vérifié', points: 0, reason: 'Aucun contact vérifié en base' });
    }

    const audit = lead.auditData as { performanceScore?: number } | null;
    const perf = audit?.performanceScore;
    if (typeof perf === 'number') {
      const opportunityPoints = perf < 50 ? 25 : perf < 80 ? 15 : 5;
      score += opportunityPoints;
      breakdown.push({ criterion: 'Opportunité technique', points: opportunityPoints, reason: `Score performance: ${perf}/100` });
    } else {
      breakdown.push({ criterion: 'Opportunité technique', points: 0, reason: "Pas encore audité" });
    }

    const sectors = (lead.mission?.parameters as { sectors?: string[] } | null)?.sectors ?? [];
    if (sectors.length > 0) {
      score += 15;
      breakdown.push({ criterion: 'Mission active', points: 15, reason: `Secteurs ciblés: ${sectors.join(', ')}` });
    }

    const statusPoints: Record<string, number> = {
      NEW: 5, ENRICHED: 10, DRAFTED: 15, CONTACTED: 20, REPLIED: 30, MEETING_BOOKED: 30, BOUNCED: -20,
    };
    const sp = statusPoints[lead.status] ?? 0;
    score += sp;
    breakdown.push({ criterion: 'Avancement pipeline', points: sp, reason: `Statut actuel: ${lead.status}` });

    score = Math.max(0, Math.min(100, score));

    // Persisté depuis la migration 20260801024457_add_lead_score — avant
    // ça le score était calculé puis jeté, invisible dans l'admin.
    await prisma.lead.update({ where: { id: leadId }, data: { score } });

    await this.logger.finishTask(`Lead ${lead.companyName} scoré: ${score}/100`);
    return { leadId, score, breakdown };
  }

  public async rescoreMission(missionId: string): Promise<LeadScore[]> {
    const leads = await prisma.lead.findMany({ where: { missionId }, select: { id: true } });
    const scores: LeadScore[] = [];
    for (const lead of leads) {
      scores.push(await this.scoreLead(lead.id));
    }
    return scores.sort((a, b) => b.score - a.score);
  }
}
