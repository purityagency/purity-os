import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AutonomousAgent } from './AgentCore';
import { cleanBelgianPhone } from '@/lib/acquisition/phone';

const EMAIL_DOMAIN_BLOCKLIST = [
  'wixpress.com', 'sentry.io', 'godaddy.com', 'cloudflare.com',
  'schema.org', 'w3.org', 'example.com', 'google.com', 'gstatic.com',
];

/**
 * Extraction téléphone belge — volontairement stricte après un vrai bug
 * observé en test : un premier regex permissif attrapait des dates
 * ("023/09/2024") en les prenant pour des numéros. Deux passes :
 *  1. Liens `tel:` explicites — intention sans ambiguïté, priorité absolue.
 *  2. Fallback regex qui exige exactement 9 chiffres significatifs (norme
 *     belge) et rejette tout groupe de 4 chiffres consécutifs (signature
 *     d'une année, donc d'une date, jamais d'un numéro de téléphone belge).
 */
/**
 * Un numéro belge groupé (avec séparateurs) ne groupe jamais plus de 2-3
 * chiffres après le premier groupe — un groupe de 4+ chiffres en position
 * non-initiale (ex: une année dans une date "09/2024", ou un identifiant
 * "17289") n'est structurellement pas un numéro belge. Sans séparateur
 * (format compact "0032474382365"), il n'y a rien à valider par groupe.
 */
function hasValidBelgianGrouping(rawMatch: string): boolean {
  const groups = rawMatch.split(/[\s./-]/).filter(Boolean);
  if (groups.length <= 1) return true;
  const [first, ...rest] = groups;
  if (first.length < 2 || first.length > 4) return false;
  return rest.every((g) => g.length === 2 || g.length === 3);
}

function extractBelgianPhone(html: string): string | null {
  const telLink = html.match(/href=["']tel:([+\d\s./-]+)["']/i);
  if (telLink) {
    const digits = telLink[1].replace(/\D/g, '');
    if (digits.length >= 8) return telLink[1].trim();
  }

  // Les numéros belges ont 9 OU 10 chiffres significatifs selon le type
  // (fixe à indicatif court vs mobile) — {6,9} + le \d final couvre les
  // deux cas ; le tri par nombre de chiffres exact se fait après capture.
  const candidates = html.match(/(?:\+32|0032|0)[\s./-]?(?:\d[\s./-]?){6,9}\d/g) ?? [];
  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, '').replace(/^0032/, '0').replace(/^32/, '0');
    const significantDigits = digits.startsWith('0') ? digits : `0${digits}`;
    if (significantDigits.length !== 9 && significantDigits.length !== 10) continue;
    if (!hasValidBelgianGrouping(candidate)) continue;
    return candidate.trim();
  }
  return null;
}

// Cloudflare masque les emails en HTML (`<a data-cfemail="a1b2...">`) : le
// texte est XORé avec le premier octet comme clé. Beaucoup de sites belges
// l'utilisent — sans ce décodage, leur email est invisible et le lead paraît
// injoignable à tort.
function decodeCloudflareEmails(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/data-cfemail=["']([0-9a-fA-F]+)["']/g)) {
    const hex = m[1];
    try {
      const key = parseInt(hex.slice(0, 2), 16);
      let email = '';
      for (let i = 2; i < hex.length; i += 2) {
        email += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
      }
      if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) out.push(email);
    } catch {
      /* hex invalide : on ignore */
    }
  }
  return out;
}

// Récupère le HTML d'une page en tolérant l'échec (timeout court) — jamais
// bloquant pour le pipeline.
async function fetchHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000), redirect: 'follow' });
    return res.ok ? await res.text() : '';
  } catch {
    return '';
  }
}

// Pages où un email de contact se cache le plus souvent, au-delà de l'accueil.
const CONTACT_PATHS = [
  '/contact', '/contact.html', '/contact-us', '/contactez-nous', '/nous-contacter',
  '/a-propos', '/about', '/qui-sommes-nous', '/equipe', '/notre-equipe', '/team',
  '/mentions-legales', '/cgv', '/rendez-vous', '/reservation', '/prendre-rendez-vous',
];

// Beaucoup de sites masquent l'email pour éviter les robots :
// "nom [at] domaine [dot] be", "nom (at) domaine.be", "nom arobase domaine.be".
// On dé-obfusque ces formes fréquentes avant d'extraire (formes crochets /
// parenthèses / "arobase" uniquement — jamais " at "/" point " nus, trop
// courants en anglais/français pour être fiables).
function deobfuscateEmails(html: string): string {
  return html
    .replace(/\s*[[(]\s*at\s*[\])]\s*/gi, '@')
    .replace(/\s*[[(]\s*dot\s*[\])]\s*/gi, '.')
    .replace(/\s+arobase\s+/gi, '@')
    .replace(/&#0?64;/g, '@');
}

const ContactExtractionSchema = z.object({
  contactName: z.string().nullable(),
  contactRole: z.string().nullable(),
  bestEmail: z.string().nullable(),
});
type ContactExtraction = z.infer<typeof ContactExtractionSchema>;

// ── Qualité de l'email de contact ────────────────────────────────────────────
// Objectif métier : joindre LA PERSONNE qui décide (gérant, CEO, manager), pas
// une boîte générique lue par personne (info@, contact@) qui finit en poubelle.
// On classe déterministiquement (regex-first) le local-part de chaque email.
export type EmailQuality = 'nominative' | 'role' | 'generic';

// Boîtes de service génériques : personne de précis derrière → dernier recours.
const GENERIC_LOCALS = new Set([
  'info', 'contact', 'contacts', 'hello', 'hallo', 'hi', 'bonjour', 'bienvenue',
  'welcome', 'mail', 'email', 'e-mail', 'admin', 'administratie', 'office',
  'bureau', 'reception', 'accueil', 'secretariat', 'secretaire', 'sales', 'sale',
  'vente', 'ventes', 'commercial', 'support', 'help', 'aide', 'team', 'equipe',
  'noreply', 'no-reply', 'donotreply', 'newsletter', 'marketing', 'boutique',
  'shop', 'webshop', 'order', 'commande', 'facturation', 'compta', 'comptabilite',
  'billing', 'invoice', 'job', 'jobs', 'recrutement', 'rh', 'hr', 'press', 'presse',
]);
// Local-parts qui désignent explicitement un décideur → très bon signal.
const ROLE_TOKENS = [
  'gerant', 'direction', 'directeur', 'directrice', 'ceo', 'patron', 'fondateur',
  'founder', 'manager', 'owner', 'proprietaire', 'dg', 'gm', 'boss', 'president',
];

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Classe un email selon son local-part. `brandTokens` = mots du nom de domaine
 *  (ex: "gaumauto") pour repérer les boîtes au nom de l'entreprise = génériques. */
export function classifyEmail(email: string, brandTokens: string[] = []): EmailQuality {
  const local = stripAccents(email.split('@')[0]?.toLowerCase() ?? '');
  if (!local) return 'generic';
  const cleaned = local.replace(/[._-]/g, ''); // "jean.dupont" -> "jeandupont"

  // Rôle-décideur : le local CONTIENT un mot de décideur.
  if (ROLE_TOKENS.some((t) => local.includes(t))) return 'role';

  // Générique : local exact dans la liste, ou = au nom de marque, ou numérique.
  const firstToken = local.split(/[._-]/)[0];
  if (GENERIC_LOCALS.has(local) || GENERIC_LOCALS.has(firstToken)) return 'generic';
  if (brandTokens.some((b) => b.length >= 3 && cleaned === b)) return 'generic';
  if (/^\d+$/.test(cleaned)) return 'generic';

  // Sinon : ressemble à un nom de personne (prenom, prenom.nom, p.nom…) → nominatif.
  return 'nominative';
}

const QUALITY_RANK: Record<EmailQuality, number> = { nominative: 3, role: 2, generic: 1 };

// Boîtes marketing/communication : dans une GRANDE structure, c'est ce service
// qui gère le budget création/refonte de site → interlocuteur pertinent. Dans
// une TPE, le gérant prime et ces boîtes restent secondaires.
const MARKETING_LOCALS = new Set(['marketing', 'communication', 'comm', 'digital', 'web', 'ecommerce', 'presse', 'press', 'media', 'medias']);

export type CompanySize = 'MICRO' | 'PME' | 'GRANDE';

// Estimation gratuite de la taille à partir du HTML réel du site. Défaut MICRO
// (cœur de cible de Purity : TPE/commerces locaux). Renforcé plus tard par KBO
// (forme légale + effectif).
export function estimateCompanySize(html: string): CompanySize {
  const t = stripAccents((html || '').toLowerCase());
  let score = 0;
  const emp = t.match(/(\d{2,5})\s*(?:collaborateur|employ|salari|personnes|experts|talents|membres)/);
  if (emp) { const n = parseInt(emp[1], 10); if (n >= 200) score += 4; else if (n >= 50) score += 3; else if (n >= 15) score += 2; }
  if (/carriere|nos offres d.emploi|rejoignez|/.test(t) && /\/jobs|\/careers|\/carrieres|recrutement/.test(t)) score += 1;
  if (/nos agences|nos filiales|\bgroupe\b|succursale|international|nos bureaux|worldwide|nos implantations/.test(t)) score += 2;
  if (/societe anonyme|\bs\.?a\.?\b/.test(t)) score += 1;
  const mgr = (t.match(/directeur|directrice|responsable|manager|head of|chief|departement|service /g) || []).length;
  if (mgr >= 8) score += 2; else if (mgr >= 4) score += 1;
  if (/marketing|communication|service presse|relations presse/.test(t)) score += 1;
  if (score >= 5) return 'GRANDE';
  if (score >= 2) return 'PME';
  return 'MICRO';
}

export const TARGET_PERSONA: Record<CompanySize, string> = {
  MICRO: "le gérant / patron / fondateur — la personne qui gère TOUT et déciderait/paierait la refonte du site",
  PME: "le gérant OU le responsable marketing / communication",
  GRANDE: "le responsable marketing / communication / digital (celui qui gère le budget site web) — surtout PAS le CEO",
};

// Qualité d'un email en tenant compte de la taille : une boîte marketing devient
// un contact rôle-décideur dès qu'on n'est plus sur une micro-structure.
function qualityFor(email: string, brandTokens: string[], size: CompanySize): EmailQuality {
  const base = classifyEmail(email, brandTokens);
  if (base !== 'generic') return base;
  const local = stripAccents(email.split('@')[0]?.toLowerCase() ?? '');
  const firstToken = local.split(/[._-]/)[0];
  if (size !== 'MICRO' && (MARKETING_LOCALS.has(local) || MARKETING_LOCALS.has(firstToken))) return 'role';
  return 'generic';
}

// Un module qui ne matche pas "M" + chiffres n'est pas un vrai identifiant
// du catalogue officiel — voir finding audit 2026-08-02 : avant ce schéma,
// rien n'empêchait le modèle d'inventer un nom de module plausible.
// Signal d'OPPORTUNITÉ technique dérivé du HTML réel du site (0-100, haut =
// plus d'opportunité commerciale = site qui a le plus besoin de nous). Sert de
// carburant au scoring quand PageSpeed est indisponible (rate-limité sans clé),
// pour éviter que tous les leads reçoivent la même valeur par défaut et que le
// score s'écrase (finding audit 2026-08-09 : scoring en trompe-l'œil).
function computeTechOpportunity(html: string, url: string): number {
  if (!html) return 50; // inconnu = opportunité moyenne, jamais 0
  const lower = html.toLowerCase();
  let opp = 30; // base
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) opp += 30; // pas de responsive mobile
  if (url.startsWith('http://')) opp += 15;                       // pas de HTTPS
  if (/wp-content|wordpress|wix\.com|joomla|weebly|jimdo|ionos|1and1/i.test(lower)) opp += 20; // techno datée/template
  if (html.length < 8000) opp += 15;                              // site très léger (souvent une seule page pauvre)
  if (/__next|_nuxt|data-reactroot|cdn\.tailwindcss|react-dom/i.test(lower)) opp -= 25; // déjà moderne
  return Math.max(5, Math.min(100, opp));
}

// Signaux de conversion/présence détectés dans le HTML déjà scrappé — même
// passe que computeTechOpportunity, aucun fetch supplémentaire. Exposés comme
// booléens discrets (checklist "Audit Conversion") au lieu d'être noyés dans
// le seul score composite techOpportunity.
export interface SiteSignals {
  hasWhatsApp: boolean;
  hasContactForm: boolean;
  hasBookingWidget: boolean;
  hasAnalytics: boolean;
  hasViewportMeta: boolean;
  isHttps: boolean;
  cmsDetected: string | null;
  socialLinks: { platform: string; url: string }[];
}

const SOCIAL_LINK_PATTERNS: [string, RegExp][] = [
  ['instagram', /https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.\-]+/i],
  ['facebook', /https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9_.\-]+/i],
  ['linkedin', /https?:\/\/(www\.)?linkedin\.com\/(company|in)\/[a-zA-Z0-9_\-]+/i],
  ['tiktok', /https?:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9_.\-]+/i],
];

function detectSiteSignals(html: string, url: string): SiteSignals {
  if (!html) {
    return {
      hasWhatsApp: false, hasContactForm: false, hasBookingWidget: false, hasAnalytics: false,
      hasViewportMeta: false, isHttps: !url.startsWith('http://'), cmsDetected: null, socialLinks: [],
    };
  }
  const lower = html.toLowerCase();
  const cmsMatch = lower.match(/wp-content|wordpress|wix\.com|joomla|weebly|jimdo|ionos|1and1/i);
  const socialLinks = SOCIAL_LINK_PATTERNS
    .map(([platform, re]) => { const m = html.match(re); return m ? { platform, url: m[0] } : null; })
    .filter((x): x is { platform: string; url: string } => x !== null);

  return {
    hasWhatsApp: /wa\.me\/|api\.whatsapp\.com/i.test(html),
    hasContactForm: /<form[\s>]/i.test(html),
    hasBookingWidget: /calendly\.com|doctolib\.(fr|be)|simplybook|resengo|bookeo|planitor/i.test(lower),
    hasAnalytics: /gtag\(|googletagmanager\.com|connect\.facebook\.net.*fbevents|static\.hotjar\.com/i.test(html),
    hasViewportMeta: /<meta[^>]+name=["']viewport["']/i.test(html),
    isHttps: !url.startsWith('http://'),
    cmsDetected: cmsMatch ? cmsMatch[0] : null,
    socialLinks,
  };
}

const AuditAnalysisSchema = z.object({
  painPoints: z.array(z.string().min(5)).min(1),
  recommendedModules: z.array(z.string().regex(/^M\d{2}$/, "doit être un code module réel, ex: M04")).min(1),
});
type AuditAnalysis = z.infer<typeof AuditAnalysisSchema>;

export class IntelligenceAnalyst extends AutonomousAgent {
  constructor() {
    super(
      "Intelligence Analyst",
      {
        role: [
          "Tu es Karim Haddad, Intelligence Analyst du pôle Acquisition de",
          "Purity Agency. Auditeur sans complaisance — les faits d'abord,",
          "jamais une impression. Tu produis un audit qui tiendrait devant un",
          "client sceptique : score réel, présence HTTPS, responsive ou non.",
          "Tu formules les points de douleur commerciaux avec précision, sans",
          "exagération ni minimisation — un score de 60/100 n'est pas",
          "'catastrophique', un score de 20/100 n'est pas 'à améliorer'.",
          "Chaque module que tu recommandes doit être un vrai identifiant du",
          "catalogue officiel (format MXX), jamais un nom que tu inventes.",
        ].join(' '),
        department: "01_ACQUISITION",
        knowledgeFiles: ["purity_catalogue_officiel_v2.md"]
      }
    );
  }

  /**
   * Extraction de contact — regex déterministe sur le HTML réel pour
   * trouver les candidats (jamais inventés), puis LLM pour ORGANISER ces
   * candidats réels (jamais pour en créer un nouveau). Voir garde-fou :
   * "ne devine jamais un email".
   */
  private async extractContact(url: string): Promise<{
    contactName: string | null;
    contactRole: string | null;
    contactEmail: string | null;
    emailQuality: EmailQuality | null;
    companySize: CompanySize | null;
    contactPhone: string | null;
    techOpportunity: number;
    siteSignals: SiteSignals;
  }> {
    // On lit l'accueil PUIS on découvre dynamiquement toutes les sous-pages de
    // contact, d'équipe et d'aide (ex: /contact, /a-propos, /notre-equipe, /mentions-legales).
    // Les fetchs tournent en parallèle, chacun avec son propre timeout, jamais bloquant.
    let origin = '';
    try {
      origin = new URL(url).origin;
    } catch {
      origin = '';
    }

    const homeHtml = await fetchHtml(url);

    // Extraction dynamique des liens internes de contact et d'équipe sur l'accueil
    const dynamicSubpages: string[] = [];
    if (homeHtml && origin) {
      const linkMatches = homeHtml.matchAll(/href=["']([^"']+)["']/gi);
      for (const m of linkMatches) {
        const href = m[1].trim();
        if (/contact|about|equipe|team|mentions|legal|impressum|qui-sommes-nous|nous-contacter|rendez-vous|reservation/i.test(href)) {
          try {
            const absoluteUrl = new URL(href, url).href;
            if (absoluteUrl.startsWith(origin) && !dynamicSubpages.includes(absoluteUrl) && absoluteUrl !== url) {
              dynamicSubpages.push(absoluteUrl);
            }
          } catch {
            /* URL invalide ignorée */
          }
        }
      }
    }

    const staticUrls = origin ? CONTACT_PATHS.map((p) => origin + p) : [];
    const targetUrls = [...new Set([...dynamicSubpages, ...staticUrls])].slice(0, 10);

    const subpagesHtml = await Promise.all(targetUrls.map(fetchHtml));
    const pages = [homeHtml, ...subpagesHtml];
    const html = pages.filter(Boolean).join('\n');
    const techOpportunity = computeTechOpportunity(homeHtml || html, url);
    const siteSignals = detectSiteSignals(homeHtml || html, url);

    if (!html) {
      return { contactName: null, contactRole: null, contactEmail: null, emailQuality: null, companySize: null, contactPhone: null, techOpportunity, siteSignals };
    }

    const companySize = estimateCompanySize(html);

    // Emails depuis : texte brut + texte dé-obfusqué + liens mailto: + Cloudflare.
    const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const plainEmails = Array.from(html.matchAll(EMAIL_RE)).map((m) => m[0]);
    const deobEmails = Array.from(deobfuscateEmails(html).matchAll(EMAIL_RE)).map((m) => m[0]);
    const mailtoEmails = Array.from(html.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi)).map((m) => m[1]);
    const cfEmails = decodeCloudflareEmails(html);
    const realEmails = [...new Set([...mailtoEmails, ...cfEmails, ...plainEmails, ...deobEmails])].filter(
      (email) => !EMAIL_DOMAIN_BLOCKLIST.some((domain) => email.toLowerCase().endsWith(domain))
    );

    // Cohérence extraction ↔ affichage : on ne stocke QUE des numéros belges
    // réellement composables (mêmes règles que cleanBelgianPhone côté liste
    // d'appels), au format normalisé. Le bruit ("0901778076"…) est écarté à la
    // source plutôt que stocké puis filtré à l'affichage.
    const rawPhone = extractBelgianPhone(html);
    const contactPhone = cleanBelgianPhone(rawPhone)?.display ?? null;

    if (realEmails.length === 0) {
      return { contactName: null, contactRole: null, contactEmail: null, emailQuality: null, companySize, contactPhone, techOpportunity, siteSignals };
    }

    // Tokens du nom de domaine (ex: "gaumauto.be" -> ["gaumauto"]) pour repérer
    // les boîtes au nom de l'entreprise = génériques, pas une personne.
    const brandTokens = (origin ? origin.replace(/^https?:\/\//, '').split('.').slice(0, -1) : [])
      .map((t) => stripAccents(t.toLowerCase()).replace(/[^a-z0-9]/g, ''))
      .filter((t) => t.length >= 3 && t !== 'www');

    // RANKING DÉTERMINISTE : on choisit le meilleur email par qualité
    // (nominatif > rôle-décideur > générique). On ne se rabat sur un générique
    // que s'il n'existe rien de mieux — et on le marque comme tel.
    // Ranking taille-aware : pour une grande structure, marketing@/communication@
    // devient un contact rôle-décideur ; pour une TPE, le gérant/nominatif prime.
    const ranked = realEmails
      .map((email) => ({ email, quality: qualityFor(email, brandTokens, companySize) }))
      .sort((a, b) => QUALITY_RANK[b.quality] - QUALITY_RANK[a.quality]);
    const bestEmail = ranked[0].email;
    const emailQuality = ranked[0].quality;

    const visibleText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').slice(0, 4000);

    // Le LLM ne CHOISIT plus l'email (fait en déterministe) : il lit seulement,
    // dans le texte réel, le NOM et le RÔLE de la personne CIBLE, qui dépend de
    // la taille de l'entreprise (gérant pour une TPE ; responsable marketing pour
    // une grande structure).
    const prompt = `
      Taille estimée de l'entreprise : ${companySize}.
      Personne CIBLE à identifier en priorité : ${TARGET_PERSONA[companySize]}.
      Email de contact retenu : ${bestEmail}
      Extrait du texte visible du site (accueil + équipe + à propos + mentions légales) :
      """${visibleText}"""

      Trouve, UNIQUEMENT si c'est écrit noir sur blanc dans le texte, le NOM et le RÔLE de cette
      personne cible. Les mentions légales belges nomment souvent l'éditeur responsable ou le gérant.
      Ne devine JAMAIS un nom qui n'apparaît pas explicitement — retourne null pour contactName / contactRole si absent.
      Le champ bestEmail : recopie exactement "${bestEmail}".
    `;

    const extraction = await this.think<ContactExtraction>(
      prompt,
      'Extraction du décideur',
      ContactExtractionSchema,
      IntelligenceAnalyst.CHEAP_MODEL,
    );

    return {
      contactName: extraction.contactName,
      contactRole: extraction.contactRole,
      contactEmail: bestEmail,
      emailQuality,
      companySize,
      contactPhone,
      techOpportunity,
      siteSignals,
    };
  }

  public async analyzeLead(leadId: string): Promise<void> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      await this.logger.logError(`Lead invalide: ${leadId}`);
      return;
    }
    const hasSite = !!lead.websiteUrl;

    await this.logger.startTask(`Audit et Match Purity pour ${lead.companyName}`);

    try {
      // Un lead SANS site n'a rien à auditer techniquement (pas de PSI, pas de
      // page à scraper pour le contact) — mais c'est justement l'angle "Présence"
      // le plus fort qui existe. On ne l'abandonne plus : on saute juste les
      // étapes qui nécessitent une URL et on garde le contact déjà connu du lead
      // (souvent renseigné via Google Places lors de la capture).
      let performanceScore: number | null = null;
      let seoScore: number | null = null;
      if (hasSite) {
        const encodedUrl = encodeURIComponent(lead.websiteUrl!);
        const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodedUrl}&strategy=mobile`;
        const response = await fetch(psiUrl);
        const data = response.ok ? await response.json() : null;
        performanceScore = data?.lighthouseResult?.categories?.performance?.score * 100 || null;
        seoScore = data?.lighthouseResult?.categories?.seo?.score * 100 || null;
      }

      const rawPainPoints = [];
      if (performanceScore && performanceScore < 50) rawPainPoints.push("Vitesse mobile critique (<50)");
      if (seoScore && seoScore < 80) rawPainPoints.push("SEO de base défaillant");

      const contact = hasSite
        ? await this.extractContact(lead.websiteUrl!)
        : {
            contactName: lead.contactName,
            contactRole: lead.contactRole,
            contactEmail: lead.contactEmail,
            emailQuality: null as EmailQuality | null,
            companySize: null as CompanySize | null,
            contactPhone: null as string | null,
            techOpportunity: 100, // absence de site = opportunité maximale
            siteSignals: detectSiteSignals('', ''),
          };

      const prompt = hasSite ? `
        Voici les résultats de l'audit technique et l'opportunité de l'entreprise ${lead.companyName} (URL: ${lead.websiteUrl}):
        - Performance Mobile: ${performanceScore || 'N/A (Signal opportunité: ' + contact.techOpportunity + '/100)'}
        - SEO: ${seoScore || 'N/A'}
        - Problèmes bruts détectés: ${rawPainPoints.length > 0 ? rawPainPoints.join(', ') : 'Site existant fonctionnel'}

        Rappel de la doctrine Purity Agency : TOUTE entreprise PME / indépendant en Wallonie est un prospect à forte valeur pour Purity.
        - Si le site est lent ou daté : recommander Création / Refonte (M03, M04, M07) et Fiche Google Business (M08).
        - Si le site est déjà rapide ou moderne : recommander l'Acquisition (SEO Local M13, Publicité Google/Meta M14, Campagnes Email/SMS M15) et l'IA (Pilote Automatique Chatbot WhatsApp & Réservation 24/7 M21/M22, Purity Studio M10/M11).

        Identifie 2 à 4 modules pertinents du catalogue Purity (codes réels format "MXX", ex: M04, M07, M13, M14, M21, M22) adaptés à ce profil.
        Formule les opportunités et axes d'amélioration commerciaux de manière ultra-professionnelle et concrète.
      ` : `
        L'entreprise ${lead.companyName} (secteur/zone déduits de la mission) N'A AUCUN SITE WEB détecté.

        Rappel de la doctrine Purity Agency : TOUTE entreprise PME / indépendant en Wallonie est un prospect à forte valeur pour Purity.
        - Sans site, le point d'entrée prioritaire est TOUJOURS la Présence Digitale (M03 ou M04) et la Fiche Google Business (M08).

        Identifie 2 à 4 modules pertinents du catalogue Purity (codes réels format "MXX", ex: M03, M04, M08, M13) adaptés à ce profil, en gardant M03/M04 en tête de liste.
        Formule les opportunités et axes d'amélioration commerciaux de manière ultra-professionnelle et concrète, centrées sur l'absence de présence en ligne.
      `;

      const analysis = await this.think<AuditAnalysis>(
        prompt,
        "Analyse technique et commerciale",
        AuditAnalysisSchema
      );

      // Canal recommandé : on ne maile un décideur que si l'email est nominatif
      // ou rôle-décideur. Un email générique (info@/contact@) ne vaut PAS un
      // contact décideur → on privilégie l'appel s'il y a un numéro, sinon le
      // lead n'a aucun moyen de contact utile.
      const emailUsable = contact.emailQuality === 'nominative' || contact.emailQuality === 'role';
      const contactChannel: 'EMAIL' | 'PHONE' | 'NONE' =
        emailUsable ? 'EMAIL' : contact.contactPhone ? 'PHONE' : 'NONE';

      await prisma.lead.update({
        where: { id: leadId },
        data: {
          status: 'ENRICHED',
          contactName: contact.contactName,
          contactRole: contact.contactRole,
          contactEmail: contact.contactEmail,
          auditData: {
            performanceScore,
            seoScore,
            techOpportunity: contact.techOpportunity,
            painPoints: analysis.painPoints,
            recommendedModules: analysis.recommendedModules,
            contactPhone: contact.contactPhone,
            emailQuality: contact.emailQuality,
            companySize: contact.companySize,
            contactChannel,
            hasWhatsApp: contact.siteSignals.hasWhatsApp,
            hasContactForm: contact.siteSignals.hasContactForm,
            hasBookingWidget: contact.siteSignals.hasBookingWidget,
            hasAnalytics: contact.siteSignals.hasAnalytics,
            hasViewportMeta: contact.siteSignals.hasViewportMeta,
            isHttps: contact.siteSignals.isHttps,
            cmsDetected: contact.siteSignals.cmsDetected,
            socialLinks: contact.siteSignals.socialLinks,
            lastAuditAt: new Date().toISOString()
          }
        }
      });

      // Isolé dans son propre try/catch : un échec Google Places (quota, nom
      // introuvable, clé absente) ne doit jamais faire échouer le reste de
      // l'audit (contact, painPoints, modules déjà écrits ci-dessus).
      await this.enrichGooglePlaces(leadId, lead.companyName, lead.location);

      const qualityLabel = contact.emailQuality === 'nominative' ? 'nominatif (décideur)'
        : contact.emailQuality === 'role' ? 'rôle-décideur'
        : contact.emailQuality === 'generic' ? 'GÉNÉRIQUE (faible)' : '—';
      const contactSummary = contact.contactEmail
        ? `Contact: ${contact.contactEmail} [${qualityLabel}]${contact.contactPhone ? ` / ☎ ${contact.contactPhone}` : ''} → canal ${contactChannel}`
        : contact.contactPhone
          ? `Aucun email — mais ☎ ${contact.contactPhone} → canal PHONE.`
          : "Aucun moyen de contact utile (ni email décideur, ni téléphone) — lead non exploitable en l'état.";

      await this.logger.finishTask(`Audit terminé pour ${lead.companyName}. Recommande: ${analysis.recommendedModules.join(', ')}. ${contactSummary}`);

    } catch (error) {
      await this.logger.logError(`Échec de l'audit pour ${lead.websiteUrl ?? lead.companyName}: ${error}`);
    }
  }

  /**
   * Résout (une fois, mis en cache) puis rafraîchit la note Google Business
   * du lead. Scope volontaire : note + nombre d'avis uniquement. N'échoue
   * jamais le reste de l'audit — voir appel isolé dans analyzeLead.
   */
  public async enrichGooglePlaces(leadId: string, companyName: string, location: string | null): Promise<void> {
    try {
      const { resolvePlaceId, fetchPlaceDetails, isGooglePlacesFresh } = await import('@/lib/acquisition/googlePlaces');
      const current = await prisma.lead.findUnique({ where: { id: leadId }, select: { auditData: true } });
      if (!current) return;

      const existingAudit = (current.auditData as Record<string, unknown> | null) ?? {};
      if (isGooglePlacesFresh(existingAudit.googlePlaces)) return;

      // Pas de colonne dédiée (migration Prisma bloquée par un drift Neon non
      // lié à ce chantier) — le Place ID est mis en cache dans auditData au
      // même titre que le reste, sans nécessiter de migration de schéma.
      let placeId = typeof existingAudit.googlePlaceId === 'string' ? existingAudit.googlePlaceId : null;
      if (!placeId) {
        placeId = await resolvePlaceId(companyName, location);
        if (!placeId) return; // pas de clé API ou entreprise non résolue — pas d'erreur bruyante
      }

      const report = await fetchPlaceDetails(placeId);
      await prisma.lead.update({
        where: { id: leadId },
        data: { auditData: { ...existingAudit, googlePlaceId: placeId, googlePlaces: report } as unknown as Prisma.InputJsonValue },
      });
    } catch (error) {
      await this.logger.logError(`Échec enrichissement Google Places pour ${companyName}: ${error}`);
    }
  }
}
