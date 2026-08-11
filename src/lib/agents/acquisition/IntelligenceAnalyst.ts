import { z } from 'zod';
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
    contactPhone: string | null;
    techOpportunity: number;
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

    if (!html) {
      return { contactName: null, contactRole: null, contactEmail: null, contactPhone: null, techOpportunity };
    }

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
      return { contactName: null, contactRole: null, contactEmail: null, contactPhone, techOpportunity };
    }

    const visibleText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').slice(0, 4000);

    const prompt = `
      Voici des adresses email réellement trouvées sur le site d'une entreprise : ${realEmails.join(', ')}
      Voici un extrait du texte visible de la page :
      """${visibleText}"""

      Identifie laquelle de ces adresses email (UNIQUEMENT parmi celles listées, n'en invente aucune)
      est la plus pertinente pour contacter un décideur (gérant, responsable, fondateur) — à défaut,
      choisis l'adresse de contact générale (info@, contact@).

      Si un nom et un rôle (ex: "Gérant", "Directeur") sont EXPLICITEMENT écrits dans le texte à côté
      de cette adresse, rapporte-les. Sinon, retourne null pour contactName et contactRole — ne devine
      jamais un nom qui ne serait pas écrit noir sur blanc dans le texte fourni.
    `;

    // Choisir le meilleur email dans une liste + lire un nom explicite =
    // extraction simple → modèle lite (coût). L'audit commercial, lui, reste
    // sur flash (qualité).
    const extraction = await this.think<ContactExtraction>(
      prompt,
      'Extraction de contact',
      ContactExtractionSchema,
      IntelligenceAnalyst.CHEAP_MODEL,
    );

    const bestEmail = extraction.bestEmail && realEmails.includes(extraction.bestEmail)
      ? extraction.bestEmail
      : realEmails[0];

    return {
      contactName: extraction.contactName,
      contactRole: extraction.contactRole,
      contactEmail: bestEmail,
      contactPhone,
      techOpportunity,
    };
  }

  public async analyzeLead(leadId: string): Promise<void> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || !lead.websiteUrl) {
      await this.logger.logError(`Lead invalide ou sans site web: ${leadId}`);
      return;
    }

    await this.logger.startTask(`Audit et Match Purity pour ${lead.companyName}`);

    try {
      const encodedUrl = encodeURIComponent(lead.websiteUrl);
      const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodedUrl}&strategy=mobile`;

      const response = await fetch(psiUrl);
      const data = response.ok ? await response.json() : null;

      const performanceScore = data?.lighthouseResult?.categories?.performance?.score * 100 || null;
      const seoScore = data?.lighthouseResult?.categories?.seo?.score * 100 || null;

      const rawPainPoints = [];
      if (performanceScore && performanceScore < 50) rawPainPoints.push("Vitesse mobile critique (<50)");
      if (seoScore && seoScore < 80) rawPainPoints.push("SEO de base défaillant");

      const contact = await this.extractContact(lead.websiteUrl);

      const prompt = `
        Voici les résultats de l'audit technique et l'opportunité de l'entreprise ${lead.companyName} (URL: ${lead.websiteUrl}):
        - Performance Mobile: ${performanceScore || 'N/A (Signal opportunité: ' + contact.techOpportunity + '/100)'}
        - SEO: ${seoScore || 'N/A'}
        - Problèmes bruts détectés: ${rawPainPoints.length > 0 ? rawPainPoints.join(', ') : 'Site existant fonctionnel'}

        Rappel de la doctrine Purity Agency : TOUTE entreprise PME / indépendant en Wallonie est un prospect à forte valeur pour Purity.
        - Si le site est lent ou daté : recommander Création / Refonte (M03, M04, M07) et Fiche Google Business (M08).
        - Si le site est déjà rapide ou moderne : recommander l'Acquisition (SEO Local M13, Publicité Google/Meta M14, Campagnes Email/SMS M15) et l'IA (Pilote Automatique Chatbot WhatsApp & Réservation 24/7 M21/M22, Purity Studio M10/M11).

        Identifie 2 à 4 modules pertinents du catalogue Purity (codes réels format "MXX", ex: M04, M07, M13, M14, M21, M22) adaptés à ce profil.
        Formule les opportunités et axes d'amélioration commerciaux de manière ultra-professionnelle et concrète.
      `;

      const analysis = await this.think<AuditAnalysis>(
        prompt,
        "Analyse technique et commerciale",
        AuditAnalysisSchema
      );

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
            lastAuditAt: new Date().toISOString()
          }
        }
      });

      const contactSummary = contact.contactEmail
        ? `Contact trouvé: ${contact.contactEmail}${contact.contactPhone ? ` / ${contact.contactPhone}` : ''}`
        : "Aucun contact trouvé — le lead restera injoignable par RevOps tant qu'un contact n'est pas ajouté manuellement.";

      await this.logger.finishTask(`Audit terminé pour ${lead.companyName}. Recommande: ${analysis.recommendedModules.join(', ')}. ${contactSummary}`);

    } catch (error) {
      await this.logger.logError(`Échec de l'audit pour ${lead.websiteUrl}: ${error}`);
    }
  }
}
