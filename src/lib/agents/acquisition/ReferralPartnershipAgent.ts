import { prisma } from '@/lib/prisma';
import { AutonomousAgent } from './AgentCore';
import Exa from 'exa-js';

// Instanciation paresseuse — voir le commentaire équivalent dans MarketScout.ts.
// Un `new Exa()` au niveau module fait planter le build Vercel dès que ce
// fichier est importé, même sans appel réel.
let _exa: Exa | undefined;
function getExa(): Exa {
  if (!_exa) {
    const exaApiKey = process.env.EXA_API_KEY;
    if (!exaApiKey) {
      throw new Error(
        '[ReferralPartnershipAgent] EXA_API_KEY manquant — variable d\'environnement Vercel en ' +
        'production, purity-os/.env en local. Aucun repli silencieux sur une clé factice.'
      );
    }
    _exa = new Exa(exaApiKey);
  }
  return _exa;
}

export interface ReferralCandidate {
  projectId: string;
  clientName: string | null;
  reason: string;
}

export interface PartnerCandidate {
  name: string;
  url: string;
}

export class ReferralPartnershipAgent extends AutonomousAgent {
  constructor() {
    super(
      'Referral & Partnership Agent',
      {
        role: 'Tu es Emma Lambrecht, Referral & Partnership Agent du pôle Acquisition de Purity Agency. Tu identifies les clients satisfaits et les partenaires potentiels, mais tu ne contactes jamais toi-même — tu proposes une liste au Chief.',
        department: '01_ACQUISITION',
      }
    );
  }

  public async findReferralCandidates(): Promise<ReferralCandidate[]> {
    await this.logger.startTask('Recherche de clients ambassadeurs potentiels');

    const projects = await prisma.project.findMany({
      where: { status: 'COMPLETED' },
      include: { client: true, payments: true },
    });

    const candidates: ReferralCandidate[] = [];
    for (const project of projects) {
      const hasOverdueBalance = project.payments.some((p) => p.status === 'PENDING' && p.type === 'BALANCE');
      if (!hasOverdueBalance) {
        candidates.push({
          projectId: project.id,
          clientName: project.client?.name ?? null,
          reason: 'Projet livré, aucun solde en attente — signal positif minimal, PAS un NPS confirmé.',
        });
      }
    }

    await this.logger.finishTask(`${candidates.length} candidat(s) identifié(s) — proposition au Chief, aucun contact envoyé.`);
    return candidates;
  }

  public async mapLocalPartners(sector: string, location: string): Promise<PartnerCandidate[]> {
    await this.logger.startTask(`Cartographie de partenaires pour ${sector} à ${location}`);

    const response = await getExa().search(
      `comptable OR "chambre de commerce" OR agence complémentaire ${sector} ${location} Belgique`,
      { numResults: 5 }
    );

    const partners = response.results.map((r) => ({ name: r.title || r.url, url: r.url }));
    await this.logger.finishTask(`${partners.length} partenaire(s) potentiel(s) identifié(s).`);
    return partners;
  }
}
