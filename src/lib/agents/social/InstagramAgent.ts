import { z } from 'zod';
import { AutonomousAgent } from '@/lib/agents/acquisition/AgentCore';

// ─────────────────────────────────────────────────────────────────────────────
// Agent Instagram — premier agent du pôle 07_VISIBILITE_SOCIALE.
// Persona : Jade Willems, responsable contenu Instagram de Purity Agency.
// Il NE publie pas lui-même : il produit du contenu prêt-à-poster, calé sur la
// stratégie (SocialStrategy) + le playbook (InstagramPlaybook) + le brand book
// (ToneOfVoice, ContentPillars, BrandRules). La publication (Meta Business Suite
// manuel, puis Graph API auto) est une étape séparée en aval.
// ─────────────────────────────────────────────────────────────────────────────

const PILLARS = ['CAS_ROI', 'AUTORITE_TECH', 'ESTHETIQUE', 'COULISSES'] as const;
const FORMATS = ['REEL', 'CARROUSEL', 'POST'] as const;

const ContentItemSchema = z.object({
  pillar: z.enum(PILLARS).describe('Pilier de contenu (voir ContentPillars/SocialStrategy)'),
  format: z.enum(FORMATS).describe('Format Instagram le plus adapté au message'),
  title: z.string().describe('Titre interne court de l’idée (pour le calendrier)'),
  hook: z.string().describe('Accroche des 3 premières secondes / 1re ligne. Doit arrêter le scroll. Jamais "Saviez-vous que".'),
  caption: z.string().describe('Légende complète prête à poster. Hook en 1re ligne, phrases courtes, aérée, 1 seul CTA.'),
  cta: z.string().describe('L’unique appel à l’action, à faible friction (ex: "Écris SITE en DM").'),
  hashtags: z.array(z.string()).min(5).max(15).describe('5 à 15 hashtags : mix local Belgique + niche métier + 1-2 larges. Sans le #.'),
  visualBrief: z.string().describe('Brief visuel : composition, texte à l’écran, message. Décrit la structure, pas une teinte imposée (direction visuelle non tranchée).'),
  reelScript: z.string().nullable().describe('Si format REEL : script horodaté (0-3s hook, etc.). Sinon null.'),
  carouselSlides: z.array(z.string()).nullable().describe('Si format CARROUSEL : le texte de chaque slide dans l’ordre. Sinon null.'),
  selfCritique: z.string().describe('Auto-critique : est-ce concret, non-générique, vendeur, fidèle au ton Purity ?'),
  humanScore: z.number().min(0).max(10).describe('Note /10 : impossible à distinguer d’un humain expert (0 = sonne IA générique).'),
});
export type InstagramContentItem = z.infer<typeof ContentItemSchema>;

const ContentPlanSchema = z.object({
  items: z.array(ContentItemSchema),
});

export interface ContentPlanInput {
  /** Nombre d’idées à générer (défaut 5 = une semaine). */
  count?: number;
  /** Forcer un pilier précis (sinon respecte la répartition 35/25/20/20). */
  pillarFocus?: (typeof PILLARS)[number];
  /** Offre / angle à mettre en avant (ex: "site premium + SEO local pour restaurants"). */
  offerFocus?: string;
  /** Contexte libre : actualité, réalisation récente, saison, promo réelle… */
  extraContext?: string;
}

export class InstagramAgent extends AutonomousAgent {
  constructor() {
    super(
      'Jade Willems — Instagram Content Lead',
      {
        role: [
          "Tu es Jade Willems, responsable du contenu Instagram de Purity Agency.",
          "Tu produis du contenu qui décroche de VRAIS clients pour l'agence (TPE/commerces belges),",
          "pas des likes. Tu penses conversion : chaque post ouvre une conversation ou prouve un résultat.",
          "Tu refuses le langage IA générique et les superlatifs creux. Tu montres, tu ne dis pas.",
        ].join(' '),
        department: '07_VISIBILITE_SOCIALE',
        knowledgeFiles: [
          'SocialStrategy.md',
          'InstagramPlaybook.md',
          'ToneOfVoice.md',
          'ContentPillars.md',
          'BrandRules.md',
          'purity_catalogue_officiel_v2.md',
        ],
      }
    );
  }

  /**
   * Génère un lot de contenus Instagram prêts à poster, calés sur la stratégie,
   * le playbook et le brand book (tous injectés en base de connaissances).
   */
  public async generateContentPlan(input: ContentPlanInput = {}): Promise<InstagramContentItem[]> {
    const count = Math.min(10, Math.max(1, input.count ?? 5));

    const prompt = `
      Produis ${count} idées de contenu Instagram prêtes à poster pour Purity Agency.

      ${input.pillarFocus ? `PILIER IMPOSÉ pour tous : ${input.pillarFocus}.` : `RÉPARTITION DES PILIERS (respecte-la sur le lot) : Cas & ROI 35%, Autorité tech 25%, Esthétique 20%, Coulisses 20%.`}
      ${input.offerFocus ? `OFFRE / ANGLE À METTRE EN AVANT : ${input.offerFocus}.` : ``}
      ${input.extraContext ? `CONTEXTE À EXPLOITER : ${input.extraContext}.` : ``}

      RÈGLES ABSOLUES :
      1. But = décrocher des clients (dirigeants de TPE/commerces belges), pas des likes.
      2. Chaque idée respecte l'anatomie du playbook : Hook (stoppe le scroll) → Valeur/démonstration → Preuve → 1 seul CTA à faible friction.
      3. Ton Purity strict (ToneOfVoice) : expert, direct, caveman, autorité tranquille. Zéro langage IA générique, zéro superlatif creux.
      4. Règle "Zéro Mock Data" ABSOLUE : INTERDICTION d'inventer un nom de client, une entreprise cliente, un chiffre, un résultat ou un témoignage. Tu ne connais aucun cas client réel. Chaque fois que tu voudrais citer un nom ("Plomberie Dupont") ou un chiffre ("+35% d'appels"), tu écris à la place un placeholder explicite entre crochets : "[NOM DU CLIENT]", "[CHIFFRE RÉEL — ex: +X% d'appels]", "[RÉSULTAT MESURÉ]". Un post avec un faux nom/chiffre est un échec, même s'il sonne bien.
      5. Choisis le format (REEL/CARROUSEL/POST) le plus adapté au message.
      6. Hashtags : 5-15, mix local Belgique + niche métier + 1-2 larges.
      7. Pour REEL remplis reelScript (horodaté) et laisse carouselSlides à null. Pour CARROUSEL remplis carouselSlides et laisse reelScript à null. Pour POST, les deux à null.

      Pour chaque idée : remplis tous les champs, puis auto-critique (selfCritique + humanScore /10). Vise humanScore >= 8.
    `;

    const result = await this.think<z.infer<typeof ContentPlanSchema>>(
      prompt,
      `Génération plan Instagram (${count} contenus${input.pillarFocus ? `, pilier ${input.pillarFocus}` : ''})`,
      ContentPlanSchema,
    );

    return result.items;
  }
}
