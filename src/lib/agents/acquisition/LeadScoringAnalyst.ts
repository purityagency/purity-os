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

    const audit = lead.auditData as { performanceScore?: number; seoScore?: number; techOpportunity?: number; contactPhone?: string } | null;

    // 1. OPPORTUNITÉ TECHNIQUE (0-35) — le cœur : "cette entreprise a-t-elle
    // besoin de nous ?". Plus le site est mauvais, plus l'opportunité est
    // grande. Ordre de préférence : PageSpeed réel > signal heuristique dérivé
    // du HTML (techOpportunity, quand PageSpeed est rate-limité) > défaut moyen.
    // Ce fallback évite que tous les leads reçoivent la même valeur et que le
    // score s'écrase (finding audit 2026-08-09).
    const perf = audit?.performanceScore;
    const techOpp = audit?.techOpportunity;
    let perfPts: number;
    if (typeof perf === 'number') {
      perfPts = perf < 30 ? 35 : perf < 50 ? 30 : perf < 70 ? 22 : perf < 85 ? 12 : 4;
      breakdown.push({ criterion: 'Opportunité technique', points: perfPts, reason: `Performance mobile ${Math.round(perf)}/100` });
    } else if (typeof techOpp === 'number') {
      perfPts = Math.round((techOpp / 100) * 35); // techOpp élevé = site faible = grosse opportunité
      breakdown.push({ criterion: 'Opportunité technique', points: perfPts, reason: `Signal site (heuristique HTML) ${techOpp}/100` });
    } else {
      perfPts = 18;
      breakdown.push({ criterion: 'Opportunité technique', points: perfPts, reason: 'Non mesurée (opportunité présumée moyenne)' });
    }
    score += perfPts;

    // 2. LACUNE SEO (0-15).
    const seo = audit?.seoScore;
    let seoPts: number;
    if (typeof seo === 'number') {
      seoPts = seo < 50 ? 15 : seo < 70 ? 10 : seo < 85 ? 5 : 0;
      breakdown.push({ criterion: 'Lacune SEO', points: seoPts, reason: `SEO ${Math.round(seo)}/100` });
    } else {
      seoPts = 6;
      breakdown.push({ criterion: 'Lacune SEO', points: seoPts, reason: 'SEO non mesuré' });
    }
    score += seoPts;

    // 3. JOIGNABILITÉ — email (0-25) : un email nominatif (jean@) vaut bien plus
    // qu'un générique (info@/contact@) car il ouvre un vrai canal 1:1.
    const email = lead.contactEmail?.toLowerCase() ?? null;
    let emailPts = 0;
    if (email) {
      const localPart = email.split('@')[0];
      const isGeneric = /^(info|contact|hello|bonjour|admin|sales|commercial|accueil|welcome|mail|no-?reply)/.test(localPart);
      emailPts = isGeneric ? 15 : 25;
      breakdown.push({ criterion: 'Joignabilité email', points: emailPts, reason: isGeneric ? `Email générique (${email})` : `Email nominatif (${email})` });
    } else {
      breakdown.push({ criterion: 'Joignabilité email', points: 0, reason: 'Aucun email — lead injoignable' });
    }
    score += emailPts;

    // 4. Téléphone présent (0-10) — canal de secours réel.
    const phonePts = audit?.contactPhone ? 10 : 0;
    if (phonePts) breakdown.push({ criterion: 'Téléphone', points: phonePts, reason: audit?.contactPhone ?? '' });
    score += phonePts;

    // 5. ENGAGEMENT (0-15) — signal fort seulement quand il existe vraiment
    // (réponse/RDV). Avant l'envoi, quasi neutre : ne doit pas gonfler le score
    // artificiellement (c'était une des causes du tassement à ~60).
    const statusPoints: Record<string, number> = {
      NEW: 0, ENRICHED: 0, DRAFTED: 2, CONTACTED: 6, REPLIED: 15, MEETING_BOOKED: 15, BOUNCED: -25,
    };
    const sp = statusPoints[lead.status] ?? 0;
    score += sp;
    breakdown.push({ criterion: 'Engagement', points: sp, reason: `Statut ${lead.status}` });

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
