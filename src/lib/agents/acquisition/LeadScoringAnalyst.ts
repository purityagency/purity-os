import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { AutonomousAgent } from './AgentCore';
import { runPageSpeedTest, isPageSpeedFresh } from '@/lib/acquisition/pageSpeedInsights';
import { computeScoreBreakdown } from '@/lib/acquisition/attackPriority';

// Seuil "hot lead" : au-delà, on déclenche un vrai test Google PageSpeed
// Insights complet sur le site du prospect (volume faible = pas de rate-limit).
const HOT_LEAD_THRESHOLD = 60;

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

  public async scoreLead(leadId: string, opts: { runPageSpeed?: boolean } = {}): Promise<LeadScore> {
    const { runPageSpeed = true } = opts;
    await this.logger.startTask(`Scoring du lead ${leadId}`);

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { mission: true } });
    if (!lead) {
      await this.logger.logError(`Lead introuvable: ${leadId}`);
      throw new Error(`Lead introuvable: ${leadId}`);
    }

    const breakdown: LeadScore['breakdown'] = [];
    let score = 0;

    const audit = lead.auditData as {
      performanceScore?: number; seoScore?: number; techOpportunity?: number; contactPhone?: string;
      hasWhatsApp?: boolean; hasContactForm?: boolean; hasBookingWidget?: boolean;
      hasViewportMeta?: boolean; isHttps?: boolean;
      googlePlaces?: { rating?: number | null; userRatingsTotal?: number | null };
    } | null;

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
    // On s'appuie sur la qualité déjà calculée par l'Intelligence Analyst
    // (nominatif > rôle > générique). Un générique ne joint aucun décideur : il
    // vaut peu, car ce lead se travaille au téléphone, pas au mail.
    const emailQuality = (audit as { emailQuality?: string } | null)?.emailQuality
      ?? (email ? (/^(info|contact|hello|bonjour|admin|sales|commercial|accueil|welcome|mail|no-?reply)/.test(email.split('@')[0]) ? 'generic' : 'nominative') : null);
    let emailPts = 0;
    if (email && emailQuality) {
      emailPts = emailQuality === 'nominative' ? 25 : emailQuality === 'role' ? 22 : 8;
      const label = emailQuality === 'generic' ? 'Email générique (faible)' : emailQuality === 'role' ? 'Email rôle-décideur' : 'Email nominatif (décideur)';
      breakdown.push({ criterion: 'Joignabilité email', points: emailPts, reason: `${label} (${email})` });
    } else {
      breakdown.push({ criterion: 'Joignabilité email', points: 0, reason: 'Aucun email — lead injoignable par mail' });
    }
    score += emailPts;

    // 4. Téléphone présent (0-12) — canal réel (appel direct, cf. fiche d'appel).
    const hasPhone = !!audit?.contactPhone;
    const phonePts = hasPhone ? 12 : 0;
    if (phonePts) breakdown.push({ criterion: 'Téléphone', points: phonePts, reason: audit?.contactPhone ?? '' });
    score += phonePts;

    // 4bis. Bonus multi-canal (0-8) : joignable À LA FOIS par email ET téléphone
    // = prospect qu'on peut travailler sur deux fronts, vrai signal de
    // convertibilité rapide. Sans ce bonus, les leads plafonnaient sous 70 alors
    // que les meilleurs (joignables partout, site à refaire) méritent le haut du
    // panier (finding cohérence 2026-08-10).
    if (email && hasPhone) {
      score += 8;
      breakdown.push({ criterion: 'Joignable multi-canal', points: 8, reason: 'Email + téléphone présents' });
    }

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

    // Bande de priorité = score × joignabilité réelle du décideur. Un score haut
    // sans moyen de joindre le décideur n'est PAS un hot lead (on ne peut rien
    // en faire). Pilote ensuite le routage par canal (email / appel / social).
    const channel = (audit as { contactChannel?: string } | null)?.contactChannel ?? null;
    const reachable = channel === 'EMAIL' || channel === 'PHONE';
    const priorityBand: 'HOT' | 'WARM' | 'COLD' =
      score >= 70 && reachable ? 'HOT'
      : (score >= 45 && reachable) || (score >= 70 && !reachable) ? 'WARM'
      : 'COLD';

    // Score pondéré "Priorité d'attaque" (Conversion 30 / Réputation 20 /
    // Mobile 15 / SEO 15 / Opportunité 20) — calcul ADDITIONNEL, n'écrase pas
    // `score`/`priorityBand` ci-dessus dont dépendent déjà la liste CRM et
    // /today. Réputation absente (pas encore de données Google Places) →
    // son poids est redistribué sur les 4 autres critères (voir attackPriority.ts).
    const scoreBreakdown = computeScoreBreakdown({
      hasWhatsApp: audit?.hasWhatsApp ?? null,
      hasContactForm: audit?.hasContactForm ?? null,
      hasBookingWidget: audit?.hasBookingWidget ?? null,
      hasPhone,
      googleRating: audit?.googlePlaces?.rating ?? null,
      googleReviewCount: audit?.googlePlaces?.userRatingsTotal ?? null,
      performanceScore: perf ?? null,
      techOpportunity: techOpp ?? null,
      hasViewportMeta: audit?.hasViewportMeta ?? null,
      isHttps: audit?.isHttps ?? null,
      seoScore: seo ?? null,
    });

    // Persisté depuis la migration 20260801024457_add_lead_score — avant
    // ça le score était calculé puis jeté, invisible dans l'admin. On fusionne
    // la bande + le canal recommandé dans auditData sans écraser le reste.
    const mergedAudit = {
      ...((lead.auditData as Record<string, unknown> | null) ?? {}),
      priorityBand,
      recommendedChannel: channel,
      attackPriority: scoreBreakdown.priority,
      attackScore: scoreBreakdown.score,
      scoreBreakdown: scoreBreakdown.criteria,
    };
    await prisma.lead.update({ where: { id: leadId }, data: { score, auditData: mergedAudit as unknown as Prisma.InputJsonValue } });

    // HOT LEAD → test Google PageSpeed Insights complet sur son site. On garde
    // le rapport dans auditData.pageSpeed pour l'afficher sur la fiche prospect.
    // Gardé par la fraîcheur : on ne relance pas à chaque re-scoring.
    if (runPageSpeed && score > HOT_LEAD_THRESHOLD && lead.websiteUrl) {
      await this.runPageSpeedForHotLead(leadId, lead.websiteUrl, lead.companyName);
    }

    await this.logger.finishTask(`Lead ${lead.companyName} scoré: ${score}/100`);
    return { leadId, score, breakdown };
  }

  /**
   * Lance le test PageSpeed Insights pour un hot lead et fusionne le rapport
   * dans auditData.pageSpeed. Non bloquant pour le scoring : toute erreur est
   * loguée mais n'échoue jamais le scoreLead (le score reste valide sans PSI).
   */
  public async runPageSpeedForHotLead(leadId: string, websiteUrl: string, companyName: string): Promise<void> {
    try {
      const current = await prisma.lead.findUnique({ where: { id: leadId }, select: { auditData: true } });
      const audit = (current?.auditData as Record<string, unknown> | null) ?? {};
      if (isPageSpeedFresh(audit.pageSpeed)) return; // rapport récent : on ne relance pas

      await this.logger.startTask(`Test PageSpeed Insights (hot lead) — ${companyName}`);
      const report = await runPageSpeedTest(websiteUrl, 'mobile');

      await prisma.lead.update({
        where: { id: leadId },
        data: { auditData: { ...audit, pageSpeed: report } as unknown as Prisma.InputJsonValue },
      });

      if (report.error) {
        await this.logger.logError(`PageSpeed indisponible pour ${companyName}: ${report.error}`);
      } else {
        await this.logger.finishTask(
          `PageSpeed ${companyName}: perf ${report.scores.performance ?? '?'}/100, SEO ${report.scores.seo ?? '?'}/100`,
        );
      }
    } catch (e) {
      await this.logger.logError(`Échec test PageSpeed pour ${companyName}: ${e instanceof Error ? e.message : e}`);
    }
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
