import type { PageSpeedReport } from "@/lib/acquisition/pageSpeedInsights"

// Moteur de préparation commerciale. À partir des données réelles d'un lead
// (audit PageSpeed, points de douleur, contact), il produit TOUT ce qu'il faut
// pour préparer notre côté d'un contact : diagnostic en langage humain,
// propositions de valeur, et un script d'appel personnalisé (ouverture,
// découverte, objections, messagerie vocale, closing).
//
// 100% DÉTERMINISTE — aucun appel LLM : instantané, gratuit, fiable, et surtout
// personnalisé à partir des VRAIS chiffres du prospect (jamais inventé).
//
// Règle : les livrables CLIENT-FACING (audit, deck) n'exposent jamais de code
// module interne (M07) ni de prix. La fiche d'appel est INTERNE — elle peut
// tout contenir (tactiques, objections, notes).

export interface LeadKitInput {
  companyName: string
  location: string | null
  contactName: string | null
  contactRole: string | null
  websiteUrl: string | null
  contactPhone: string | null
  sector?: string | null
  performanceScore?: number | null
  seoScore?: number | null
  accessibilityScore?: number | null
  bestPracticesScore?: number | null
  painPoints?: string[]
  pageSpeed?: PageSpeedReport | null
  // Codes modules (M03, M13, M21...) déjà identifiés par l'Intelligence Analyst
  // pour ce lead — permet à l'angle de vente de ne pas se limiter au site web.
  recommendedModules?: string[] | null
  // Signal d'opportunité technique (CMS daté, absence HTTPS...) calculé lors
  // de l'extraction de contact — alimente l'angle Hébergement & Sécurité.
  techOpportunity?: number | null
  // Signaux de conversion détectés dans le HTML (même scrape que ci-dessus).
  hasWhatsApp?: boolean | null
  hasContactForm?: boolean | null
  hasBookingWidget?: boolean | null
  hasAnalytics?: boolean | null
  // Google Business — scope réduit à note + nombre d'avis (voir googlePlaces.ts).
  googleRating?: number | null
  googleReviewCount?: number | null
  // Taille estimée ('MICRO' | 'PME' | 'GRANDE', cf. IntelligenceAnalyst.CompanySize)
  // — affine le profil psychologique déduit du secteur.
  companySize?: string | null
}

export interface Finding {
  title: string
  detail: string
  severity: "critique" | "moyen" | "ok"
}

export interface ValueProp {
  title: string
  detail: string
}

export interface Objection {
  trigger: string
  response: string
}

export interface CallScript {
  greeting: string
  hook: string
  permission: string
  discovery: string[]
  pitch: string
  bridgeToValue: string[]
  objections: Objection[]
  close: string
  voicemail: string
}

// Technique de persuasion issue d'un cadre reconnu, appliquée à CE prospect.
export interface PsychTactic {
  name: string
  source: string
  when: string
  example: string
}

export interface CallMechanics {
  talkListen: string
  monologueMax: string
  questionTarget: string
  bestWindow: string
  persistence: string
  tone: string
}

export interface DossierRow {
  label: string
  value: string
}

// Les 6 portes d'entrée réelles de Purity (mêmes catégories que la nav du
// site : services.html#presence, #acquisition, #automatisation, #metier,
// #studio, #hebergement). L'angle "presence" (site web) n'est qu'UNE porte
// parmi six — le calibrer comme porte par défaut faisait perdre des clients
// dont le vrai problème du quotidien est ailleurs (no-show, Excel/WhatsApp,
// visuels faibles...).
export type AngleKey = "presence" | "acquisition" | "automatisation" | "metier" | "studio" | "hebergement"

export interface SalesAngle {
  key: AngleKey
  label: string
  score: number
  // Problème du quotidien deviné à partir des signaux réels (secteur, audit,
  // modules recommandés) — jamais inventé au hasard, toujours dérivé.
  dailyPain: string
  hook: string
  objection: Objection
}

// Profil décisionnel estimé — dérivé du secteur (et, à défaut, de la taille
// d'entreprise), jamais deviné au hasard. Sert à calibrer le ton de l'appel.
export type ArchetypeKey = "artisan" | "patron_deborde" | "restaurateur" | "commercant" | "pme_structuree"

export interface Archetype {
  key: ArchetypeKey
  label: string
  convinces: string[]
  hates: string[]
}

export interface ServiceRec {
  moduleCode: string
  label: string
  why: string
}

export interface LossEstimate {
  weeklyLow: number
  weeklyHigh: number
  basis: string
}

export interface ChannelScripts {
  relanceCall: string
  sms: string
  whatsapp: string
  emailFollowup: { subject: string; body: string }
}

export interface SalesKit {
  firstName: string | null
  scores: { performance: number | null; seo: number | null; accessibility: number | null; bestPractices: number | null }
  findings: Finding[]
  valueProps: ValueProp[]
  oneLiner: string
  callScript: CallScript
  hasPhone: boolean
  vitals: { title: string; value: string; good: boolean | null }[]
  // Couche préparation d'appel (études réelles : Voss, Cialdini, Rackham,
  // Kahneman/Tversky, données Gong.io).
  dossier: DossierRow[]
  psychology: PsychTactic[]
  mechanics: CallMechanics
  openers: { noOriented: string; accusationAudit: string; patternInterrupt: string }
  afterCall: string[]
  // Multi-angles : les 6 portes d'entrée possibles, classées par pertinence
  // pour CE lead. `angles[0]` est l'angle utilisé pour bâtir callScript ;
  // `alternateAngles` sert de filet pendant l'appel si le premier angle ne
  // "prend" pas (le prospect réagit mieux à un autre problème que celui deviné).
  angles: SalesAngle[]
  alternateAngles: SalesAngle[]
  archetype: Archetype
  serviceRecommendation: { primary: ServiceRec; upsell: ServiceRec }
  lossEstimate: LossEstimate
  channelScripts: ChannelScripts
}

// Commercial qui passe l'appel (Amir). Utilisé dans les scripts au lieu de
// placeholders [TON PRÉNOM]/[TON NUMÉRO].
const REP_FIRST_NAME = "Amir"
const REP_PHONE = "0465 36 82 65"

function firstNameOf(contactName: string | null): string | null {
  if (!contactName) return null
  const n = contactName.trim().split(/\s+/)[0]
  return n && n.length > 1 ? n : null
}

// Adresse polie : "Bonjour Marc" si prénom connu, sinon "Bonjour".
function greetingLine(firstName: string | null): string {
  return firstName ? `Bonjour ${firstName},` : "Bonjour,"
}

function band(score: number | null): "critique" | "moyen" | "ok" | "inconnu" {
  if (score === null || score === undefined) return "inconnu"
  if (score >= 85) return "ok"
  if (score >= 50) return "moyen"
  return "critique"
}

// ---- Table sectorielle : problème du quotidien deviné + poids par angle ----
// Dérivée des fiches "Pour" du catalogue officiel (16 secteurs) — pas
// inventée : on reprend le raisonnement métier déjà validé par Purity.
// Matching par inclusion (insensible à la casse) car `sector` est du texte
// libre saisi par le Market Scout ("Horeca - Restaurants", "Coiffure", ...).
const SECTOR_PROFILES: {
  match: string[]
  boosts: Partial<Record<AngleKey, number>>
  pain: Partial<Record<AngleKey, string>>
  archetype: ArchetypeKey
  lossHint: { low: number; high: number; basis: string }
}[] = [
  {
    match: ["coiffure", "beaut", "institut", "spa", "esthé", "onglerie"],
    boosts: { automatisation: 25, metier: 10 },
    pain: {
      automatisation: "les rendez-vous non honorés (no-show) faute de rappel automatique",
      metier: "le planning et les fiches clientes éparpillés entre l'agenda papier et les messages",
    },
    archetype: "commercant",
    lossHint: { low: 150, high: 450, basis: "quelques créneaux non honorés (no-show) par semaine, panier moyen coiffure/beauté" },
  },
  {
    match: ["praticien", "santé", "sante", "kiné", "kine", "dentiste", "médecin", "medecin", "thérap", "therap", "ostéo", "osteo"],
    boosts: { automatisation: 25, metier: 15 },
    pain: {
      automatisation: "les rendez-vous manqués et le temps perdu au téléphone à replanifier",
      metier: "le suivi des dossiers patients qui n'est pas centralisé",
    },
    archetype: "patron_deborde",
    lossHint: { low: 200, high: 600, basis: "quelques rendez-vous manqués ou mal replanifiés par semaine" },
  },
  {
    match: ["horeca", "restaurant", "café", "cafe", "brasserie", "traiteur", "bar "],
    boosts: { automatisation: 20, studio: 15, acquisition: 10 },
    pain: {
      automatisation: "les réservations prises au téléphone en plein coup de feu, avec le risque d'erreurs",
      studio: "des photos de plats qui ne donnent pas autant envie que la réalité",
      acquisition: "le bouche-à-oreille qui ne suffit plus à remplir la salle les soirs creux",
    },
    archetype: "restaurateur",
    lossHint: { low: 300, high: 900, basis: "quelques appels ou réservations manqués par semaine, panier moyen restaurant" },
  },
  {
    match: ["artisan", "btp", "construction", "plombier", "électric", "electric", "menuisier", "toiture", "chauffagiste"],
    boosts: { acquisition: 20, metier: 15 },
    pain: {
      acquisition: "être trouvé en premier sur Google au moment précis où un client a une urgence chez lui",
      metier: "les devis et les relances clients qui se perdent entre les chantiers",
    },
    archetype: "artisan",
    lossHint: { low: 250, high: 800, basis: "un chantier urgent raté par mois faute d'être trouvé à temps, ramené à la semaine" },
  },
  {
    match: ["commerce", "retail", "boutique", "magasin"],
    boosts: { studio: 20, acquisition: 15 },
    pain: {
      studio: "des visuels produits qui ne reflètent pas la qualité réelle en boutique",
      acquisition: "la visibilité locale raflée par les grandes enseignes",
    },
    archetype: "commercant",
    lossHint: { low: 200, high: 600, basis: "quelques visites en boutique non déclenchées par semaine faute de visibilité locale" },
  },
  {
    match: ["e-commerce", "ecommerce", "boutique en ligne"],
    boosts: { metier: 15, studio: 20, automatisation: 10 },
    pain: {
      metier: "le suivi des commandes et du stock qui prend un temps fou",
      studio: "des fiches produits qui ne convertissent pas assez",
      automatisation: "les paniers abandonnés jamais relancés",
    },
    archetype: "commercant",
    lossHint: { low: 250, high: 750, basis: "paniers abandonnés jamais relancés, sur une semaine de trafic moyen" },
  },
  {
    match: ["consultant", "b2b", "agence", "immobilier", "courtier", "comptable", "avocat", "notaire"],
    boosts: { metier: 30, acquisition: 10 },
    pain: {
      metier: "le suivi des prospects et clients qui vit dans la tête ou dans un fichier Excel, sans vraie visibilité",
    },
    archetype: "pme_structuree",
    lossHint: { low: 400, high: 1200, basis: "un prospect mal suivi ou oublié par semaine, valeur moyenne d'un dossier B2B" },
  },
]

const DEFAULT_LOSS_HINT = { low: 200, high: 600, basis: "quelques demandes non converties par semaine, panier moyen d'une PME locale" }

const ARCHETYPE_COPY: Record<ArchetypeKey, Omit<Archetype, "key">> = {
  artisan: {
    label: "Artisan terrain",
    convinces: ["Gagner du temps sur l'administratif", "Ne plus rater d'appels ou de demandes", "Une réputation locale solide"],
    hates: ["Le jargon technique", "Les rendez-vous à rallonge", "Les promesses vagues sans chiffres"],
  },
  patron_deborde: {
    label: "Patron débordé",
    convinces: ["Un gain de temps immédiat", "Zéro prise de tête — on s'occupe de tout", "Un résultat visible sans effort de sa part"],
    hates: ["Les process compliqués", "Le jargon technique", "Devoir tout réexpliquer deux fois"],
  },
  restaurateur: {
    label: "Restaurateur",
    convinces: ["Remplir la salle", "La réputation et les avis Google", "Des réservations sans erreur en plein service"],
    hates: ["Être dérangé pendant le coup de feu", "Le jargon technique", "Un engagement long et rigide"],
  },
  commercant: {
    label: "Commerçant",
    convinces: ["Plus de clients en boutique", "Une image professionnelle", "La visibilité locale face aux grandes enseignes"],
    hates: ["Le jargon technique", "Un gros investissement de départ", "Des changements compliqués à gérer seul"],
  },
  pme_structuree: {
    label: "PME structurée",
    convinces: ["Un chiffre d'affaires mesurable", "Des process structurés et fiables", "Un ROI démontrable"],
    hates: ["Les promesses vagues", "L'absence de reporting", "Le manque de professionnalisme"],
  },
}

// Noms lisibles des modules effectivement utilisés par MODULE_ANGLE. M21-M23
// relabellisés "Assistant IA / réceptionniste" (décision verrouillée : pas de
// produit "ProCall" — on mappe sur le Pilote Automatique réel du catalogue).
const MODULE_NAMES: Record<string, string> = {
  M03: "Page Essentielle", M04: "Site Vitrine", M05: "Site Complet", M06: "Boutique en Ligne", M07: "Refonte & Modernisation",
  M08: "Fiche Google Business", M13: "Référencement Local (SEO)", M14: "Publicité Digitale", M15: "Campagnes Email & SMS", M16: "Gestion des Réseaux Sociaux",
  M17: "Réservation en Ligne", M20: "Réputation & Avis en Ligne",
  M21: "Assistant IA / réceptionniste (Essentiel)", M22: "Assistant IA / réceptionniste (Business)", M23: "Assistant IA / réceptionniste (Intégral)",
  M18: "Gestion Client (CRM)", M19: "Portail Client Sécurisé",
  M09: "Identité Visuelle", M10: "Visuels Produit & Marque", M11: "Vidéos & Reels", M12: "Rédaction Web & Blog",
  M24: "Maintenance & Hébergement",
}

const DEFAULT_ANGLE_PAIN: Record<Exclude<AngleKey, "presence">, string> = {
  acquisition: "être invisible face aux concurrents quand un client cherche vos services sur Google",
  automatisation: "le temps perdu à répondre à la main à des questions et demandes répétitives",
  metier: "les informations clients éparpillées entre mails, WhatsApp et fichiers, sans vue d'ensemble",
  studio: "des visuels qui ne reflètent pas le sérieux réel de l'activité",
  hebergement: "le risque de perdre des ventes ou des contacts si le site tombe, sans que personne ne le sache tout de suite",
}

// M-codes du catalogue Purity → angle correspondant (mêmes regroupements que
// la nav du site vitrine, cf. index.html #presence/#acquisition/#automatisation/#metier/#studio/#hebergement).
const MODULE_ANGLE: Record<string, AngleKey> = {
  M03: "presence", M04: "presence", M05: "presence", M06: "presence", M07: "presence",
  M08: "acquisition", M13: "acquisition", M14: "acquisition", M15: "acquisition", M16: "acquisition",
  M17: "automatisation", M20: "automatisation", M21: "automatisation", M22: "automatisation", M23: "automatisation",
  M18: "metier", M19: "metier",
  M09: "studio", M10: "studio", M11: "studio", M12: "studio",
  M24: "hebergement",
}

export function computeAngles(ctx: {
  company: string
  where: string
  sector: string | null
  hasSite: boolean
  perf: number | null
  seo: number | null
  bp: number | null
  recommendedModules: string[]
  techOpportunity: number | null
}): SalesAngle[] {
  const scores: Record<AngleKey, number> = { presence: 0, acquisition: 0, automatisation: 0, metier: 0, studio: 0, hebergement: 0 }
  const pain: Record<AngleKey, string | undefined> = { presence: undefined, acquisition: undefined, automatisation: undefined, metier: undefined, studio: undefined, hebergement: undefined }

  // Signaux de base (audit technique)
  scores.presence = !ctx.hasSite ? 100 : 20 + (band(ctx.perf) === "critique" ? 45 : band(ctx.perf) === "moyen" ? 20 : 0) + (band(ctx.seo) === "critique" ? 20 : band(ctx.seo) === "moyen" ? 8 : 0)
  scores.acquisition = 25 + (band(ctx.seo) === "critique" ? 45 : band(ctx.seo) === "moyen" ? 20 : 5) - (ctx.hasSite ? 0 : 10)
  scores.automatisation = 30 // pain universel : personne n'a "trop de temps libre"
  scores.metier = 15
  scores.studio = 12
  scores.hebergement = 8 + (band(ctx.bp) === "critique" ? 35 : band(ctx.bp) === "moyen" ? 15 : 0) + (ctx.techOpportunity && ctx.techOpportunity >= 60 ? 20 : 0)

  // Modules déjà identifiés par l'Intelligence Analyst → +18 par module, capé
  const moduleBoost: Record<AngleKey, number> = { presence: 0, acquisition: 0, automatisation: 0, metier: 0, studio: 0, hebergement: 0 }
  for (const m of ctx.recommendedModules) {
    const key = MODULE_ANGLE[m]
    if (key) moduleBoost[key] = Math.min(40, moduleBoost[key] + 18)
  }
  for (const k of Object.keys(scores) as AngleKey[]) scores[k] += moduleBoost[k]

  // Profil sectoriel → boost + problème du quotidien deviné
  const sectorLower = (ctx.sector || "").toLowerCase()
  const profile = SECTOR_PROFILES.find((p) => p.match.some((m) => sectorLower.includes(m)))
  if (profile) {
    for (const [k, boost] of Object.entries(profile.boosts) as [AngleKey, number][]) scores[k] += boost
    for (const [k, phrase] of Object.entries(profile.pain) as [AngleKey, string][]) pain[k] = phrase
  }

  const labels: Record<AngleKey, string> = {
    presence: "Présence en ligne",
    acquisition: "Acquisition clients",
    automatisation: "Automatisation & IA",
    metier: "Applications métier",
    studio: "Purity Studio",
    hebergement: "Hébergement & Sécurité",
  }

  const hooks: Record<AngleKey, string> = {
    presence: !ctx.hasSite
      ? `Je vous appelle parce que j'ai cherché ${ctx.company} en ligne et, très franchement, je ne vous ai pas trouvé — alors que vos concurrents${ctx.where}, oui.`
      : `J'ai regardé le site de ${ctx.company}, et il y a clairement de quoi capter plus de clients avec quelques ajustements ciblés.`,
    acquisition: `J'ai regardé où ${ctx.company} apparaît sur Google pour vos services${ctx.where} — vous n'êtes pas dans le top 3, ce qui veut dire que l'essentiel des gens qui cherchent tombent sur vos concurrents.`,
    automatisation: `Question rapide : quand un client vous écrit ou vous appelle en dehors de vos horaires, qui répond ? Si c'est "personne avant demain", ce sont des demandes qui partent ailleurs.`,
    metier: `À vue de nez, avec ${ctx.company}${ctx.where}, je me dis que le suivi des dossiers clients doit vite devenir un casse-tête entre les mails, WhatsApp et les fichiers qui se baladent.`,
    studio: `J'ai regardé les visuels de ${ctx.company} en ligne — c'est souvent ce qui joue le plus sur la confiance qu'un client vous accorde avant même de vous appeler.`,
    hebergement: `Question simple : si le site de ${ctx.company} tombait un vendredi soir, vous le sauriez comment — un client qui vous le dit, ou pas du tout ?`,
  }

  const objections: Record<AngleKey, Objection> = {
    presence: { trigger: "« J'ai déjà un site »", response: `C'est justement pour ça que je vous appelle : le vôtre existe, mais il pourrait convertir beaucoup plus. On ne repart pas de zéro, on le transforme en machine à demandes.` },
    acquisition: { trigger: "« Je suis déjà sur Google »", response: `Être sur Google et être vu, ce sont deux choses différentes : 97 % des clics vont aux 3 premiers résultats. Si vous n'y êtes pas, c'est vos concurrents qui encaissent vos clients.` },
    automatisation: { trigger: "« On gère très bien à la main »", response: `Je vous crois — jusqu'au jour où deux clients écrivent en même temps un samedi soir. L'automatisation ne remplace pas votre relation client, elle évite juste qu'une demande se perde.` },
    metier: { trigger: "« On a déjà Excel / WhatsApp pour ça »", response: `Ça marche tant que vous êtes seul à savoir où chercher. Le jour où une info se perd ou qu'un client relance deux fois, c'est du temps et de la crédibilité qui partent.` },
    studio: { trigger: "« Mes photos sont suffisantes »", response: `Elles font le travail, mais un visuel professionnel change directement le taux de clic et la confiance avant le premier contact — souvent le levier le moins cher pour un gros effet.` },
    hebergement: { trigger: "« Mon site tourne, ça suffit »", response: `Tant qu'il tourne, oui. Le problème, c'est le jour où il ne tourne plus : sans monitoring, vous perdez des heures — voire des jours — de contacts sans même le savoir.` },
  }

  const keys: AngleKey[] = ["presence", "acquisition", "automatisation", "metier", "studio", "hebergement"]
  return keys
    .map((key) => ({
      key,
      label: labels[key],
      score: scores[key],
      dailyPain: pain[key] ?? (key === "presence" ? (!ctx.hasSite ? "l'entreprise n'apparaît pas du tout quand on la cherche en ligne" : "le site n'aide pas autant qu'il pourrait à convertir les visiteurs") : DEFAULT_ANGLE_PAIN[key]),
      hook: hooks[key],
      objection: objections[key],
    }))
    .sort((a, b) => b.score - a.score)
}

// Profil décisionnel : secteur en priorité (le plus fiable), sinon taille
// d'entreprise (une grosse structure raisonne différemment d'un indépendant).
function computeArchetype(sector: string | null, companySize: string | null): Archetype {
  const sectorLower = (sector || "").toLowerCase()
  const profile = SECTOR_PROFILES.find((p) => p.match.some((m) => sectorLower.includes(m)))
  const key: ArchetypeKey = profile?.archetype ?? (companySize === "GRANDE" || companySize === "PME" ? "pme_structuree" : "patron_deborde")
  return { key, ...ARCHETYPE_COPY[key] }
}

// Service Purity à pousser en priorité + upsell naturel — dérivés des 2
// angles les mieux notés, jamais d'un produit inventé (M21-M23 relabellisés,
// pas de "ProCall" : voir MODULE_NAMES).
const DEFAULT_MODULE_FOR_ANGLE: Record<AngleKey, string> = {
  presence: "M04", acquisition: "M13", automatisation: "M22", metier: "M18", studio: "M09", hebergement: "M24",
}

function pickModuleForAngle(angleKey: AngleKey, recommendedModules: string[]): string {
  const matching = recommendedModules.find((m) => MODULE_ANGLE[m] === angleKey)
  return matching ?? DEFAULT_MODULE_FOR_ANGLE[angleKey]
}

function recommendServices(angles: SalesAngle[], recommendedModules: string[]): { primary: ServiceRec; upsell: ServiceRec } {
  const [first, second] = angles
  const primaryCode = pickModuleForAngle(first.key, recommendedModules)
  const upsellCode = pickModuleForAngle(second.key, recommendedModules)
  return {
    primary: { moduleCode: primaryCode, label: MODULE_NAMES[primaryCode] ?? primaryCode, why: first.dailyPain },
    upsell: { moduleCode: upsellCode, label: MODULE_NAMES[upsellCode] ?? upsellCode, why: second.dailyPain },
  }
}

// Estimation de pertes — toujours une fourchette + sa base de calcul, jamais
// un chiffre unique présenté comme certain (voir formulation dans l'UI).
function estimateLoss(sector: string | null): LossEstimate {
  const sectorLower = (sector || "").toLowerCase()
  const profile = SECTOR_PROFILES.find((p) => p.match.some((m) => sectorLower.includes(m)))
  const hint = profile?.lossHint ?? DEFAULT_LOSS_HINT
  return { weeklyLow: hint.low, weeklyHigh: hint.high, basis: hint.basis }
}

// Scripts multicanaux (relance/SMS/WhatsApp/email) — même doctrine que le
// reste du fichier : déterministe, dérivé de l'angle primaire, zéro LLM.
function buildChannelScripts(ctx: { firstName: string | null; company: string; primaryAngle: SalesAngle }): ChannelScripts {
  const greet = ctx.firstName
  return {
    relanceCall: `${greetingLine(greet)} ${REP_FIRST_NAME} de Purity Agency, je reviens vers vous suite à notre échange sur ${ctx.company} — vous avez eu l'occasion d'y réfléchir ?`,
    sms: `${greet ? greet + ", " : ""}c'est ${REP_FIRST_NAME} de Purity Agency. Toujours partant pour qu'on regarde ensemble ${ctx.primaryAngle.dailyPain} ? Rappelez-moi au ${REP_PHONE} quand vous avez 2 min.`,
    whatsapp: `Bonjour${greet ? ` ${greet}` : ""} 👋 ${REP_FIRST_NAME} de Purity Agency. Je vous avais contacté au sujet de ${ctx.primaryAngle.dailyPain} — toujours d'actualité de creuser ça ensemble ?`,
    emailFollowup: {
      subject: `${ctx.company} — un point rapide sur ${ctx.primaryAngle.label.toLowerCase()}`,
      body: `${greetingLine(greet)}\n\nJe reviens vers vous suite à notre échange : ${ctx.primaryAngle.hook}\n\nSi ça vous parle toujours, je vous propose un appel de 20 minutes cette semaine pour en discuter concrètement.\n\nBelle journée,\n${REP_FIRST_NAME} — Purity Agency\n${REP_PHONE}`,
    },
  }
}

export function buildSalesKit(input: LeadKitInput): SalesKit {
  const psi = input.pageSpeed && !input.pageSpeed.error ? input.pageSpeed : null
  const perf = psi?.scores.performance ?? input.performanceScore ?? null
  const seo = psi?.scores.seo ?? input.seoScore ?? null
  const a11y = psi?.scores.accessibility ?? input.accessibilityScore ?? null
  const bp = psi?.scores.bestPractices ?? input.bestPracticesScore ?? null
  const firstName = firstNameOf(input.contactName)
  const company = input.companyName
  const where = input.location ? ` à ${input.location}` : ""
  const sector = input.sector || "votre secteur"
  const hasSite = !!input.websiteUrl

  // ---- Diagnostic (langage humain, dérivé des vrais scores) ----
  const findings: Finding[] = []
  if (!hasSite) {
    findings.push({
      title: "Aucun site web trouvé",
      detail: `Quand un client cherche « ${sector}${where} » sur Google, il ne vous trouve pas — il tombe sur vos concurrents. C'est du chiffre d'affaires qui part chez eux chaque semaine.`,
      severity: "critique",
    })
  } else {
    if (band(perf) === "critique") {
      findings.push({
        title: "Site trop lent sur mobile",
        detail: `Votre site obtient ${perf}/100 en vitesse mobile. Concrètement, une bonne partie des visiteurs partent avant même qu'il s'affiche — plus de la moitié abandonnent au-delà de 3 secondes de chargement.`,
        severity: "critique",
      })
    } else if (band(perf) === "moyen") {
      findings.push({
        title: "Vitesse mobile perfectible",
        detail: `Score de ${perf}/100 en vitesse mobile : ça freine vos visiteurs et Google pénalise les sites lents dans son classement.`,
        severity: "moyen",
      })
    }
    if (band(seo) === "critique") {
      findings.push({
        title: "Quasi invisible sur Google",
        detail: `Votre référencement est à ${seo}/100. Vous n'apparaissez presque pas quand quelqu'un cherche vos services${where} — l'essentiel de vos clients potentiels ne vous voit jamais.`,
        severity: "critique",
      })
    } else if (band(seo) === "moyen") {
      findings.push({
        title: "Référencement à renforcer",
        detail: `SEO à ${seo}/100 : des bases manquent pour remonter sur les recherches locales${where}.`,
        severity: "moyen",
      })
    }
    if (band(a11y) === "critique" || band(a11y) === "moyen") {
      findings.push({
        title: "Site difficile à utiliser pour certains",
        detail: `Accessibilité à ${a11y}/100 : une partie de vos visiteurs (mobile, seniors, lecture d'écran) galère à naviguer — autant de contacts perdus.`,
        severity: band(a11y) === "critique" ? "critique" : "moyen",
      })
    }
  }
  // Points de douleur détectés par l'agent, ajoutés s'ils apportent du neuf.
  for (const p of input.painPoints ?? []) {
    if (!findings.some((f) => f.detail.includes(p) || f.title.includes(p))) {
      findings.push({ title: p, detail: "", severity: "moyen" })
    }
  }
  if (findings.length === 0) {
    findings.push({
      title: "Une présence correcte, mais exploitée à moitié",
      detail: `Les fondations sont là. Le vrai levier maintenant : transformer les visiteurs en clients (prise de rendez-vous, appels, demandes de devis) — c'est souvent là que ${company} laisse le plus d'argent sur la table.`,
      severity: "moyen",
    })
  }

  // ---- Ce qu'on apporte (mappé aux findings, sans jargon ni prix) ----
  const valueProps: ValueProp[] = []
  const push = (title: string, detail: string) => { if (!valueProps.some((v) => v.title === title)) valueProps.push({ title, detail }) }
  if (!hasSite) {
    push("Un site qui vous rend visible", `Un site moderne, rapide et pensé pour convertir, qui vous fait apparaître quand on cherche « ${sector}${where} ».`)
  }
  if (hasSite && (band(perf) === "critique" || band(perf) === "moyen")) {
    push("Un site 2 à 3× plus rapide", "On reconstruit sur une base technique moderne : chargement quasi instantané sur mobile, plus aucun visiteur perdu à cause de la lenteur.")
  }
  if (band(seo) === "critique" || band(seo) === "moyen" || !hasSite) {
    push("Remonter sur Google localement", `Optimisation du référencement local pour capter les gens qui cherchent vos services${where} — et pas ceux de vos concurrents.`)
  }
  push("Transformer les visites en clients", "Parcours clair, boutons d'appel/de contact/de prise de rendez-vous visibles : on optimise pour que chaque visite ait une chance de devenir un client.")
  push("Zéro prise de tête pour vous", "On s'occupe de tout — conception, textes, mise en ligne, suivi. Vous validez, on exécute. Vous vous concentrez sur votre métier.")

  // ---- Vitals lisibles ----
  const vitals = (psi?.coreWebVitals ?? []).map((m) => ({ title: m.title, value: m.displayValue, good: m.score === null ? null : m.score >= 0.9 }))

  // ---- Multi-angles : la vente ne part plus systématiquement du site web.
  // On score les 6 portes d'entrée (audit + modules recommandés + secteur)
  // et on garde la plus pertinente pour CE prospect précis. ----
  const angles = computeAngles({
    company,
    where,
    sector: input.sector ?? null,
    hasSite,
    perf,
    seo,
    bp,
    recommendedModules: input.recommendedModules ?? [],
    techOpportunity: input.techOpportunity ?? null,
  })
  const primaryAngle = angles[0]
  const alternateAngles = angles.slice(1, 3)

  const archetype = computeArchetype(input.sector ?? null, input.companySize ?? null)
  const serviceRecommendation = recommendServices(angles, input.recommendedModules ?? [])
  const lossEstimate = estimateLoss(input.sector ?? null)

  // Sur l'angle "Présence" avec un signal fort et chiffré (pas de site, ou
  // perf/seo critiques), le hook chiffré existant reste plus percutant que le
  // hook générique de l'angle — on ne l'écrase que si un AUTRE angle gagne,
  // ou si "Présence" gagne sans signal chiffré fort (cas "moyen"/fallback).
  const presenceHasHardSignal = !hasSite || band(perf) === "critique" || band(seo) === "critique"
  const hookByFinding = (() => {
    if (!hasSite) return `Je vous appelle parce que j'ai cherché ${company} en ligne et, très franchement, je ne vous ai pas trouvé — alors que vos concurrents${where}, oui. J'imagine que des clients passent à côté de vous sans le savoir.`
    if (band(perf) === "critique") return `J'ai regardé le site de ${company} ce matin, et il y a un truc qui m'a sauté aux yeux : sur mobile, il met un temps fou à s'afficher (${perf}/100 chez Google). En clair, une bonne partie de vos visiteurs partent avant de voir quoi que ce soit.`
    if (band(seo) === "critique") return `J'ai regardé la présence en ligne de ${company}, et le point qui coince, c'est Google : quand on cherche vos services${where}, vous n'apparaissez quasiment pas (${seo}/100). Vos futurs clients tombent sur les autres.`
    return `J'ai pris deux minutes pour regarder le site de ${company}, et il y a clairement de quoi capter plus de clients avec quelques ajustements ciblés.`
  })()
  const hook = primaryAngle.key === "presence" && presenceHasHardSignal ? hookByFinding : primaryAngle.hook

  // ---- One-liner de valeur (même logique : angle chiffré si dispo, sinon angle deviné) ----
  const worst = findings.find((f) => f.severity === "critique") ?? findings[0]
  const oneLiner = primaryAngle.key === "presence" && presenceHasHardSignal
    ? (!hasSite
        ? `${company} n'apparaît pas en ligne quand ses futurs clients la cherchent — on change ça avec un site qui attire et convertit.`
        : `${company} a un vrai potentiel en ligne inexploité (${worst.title.toLowerCase()}) — on le débloque pour transformer plus de visiteurs en clients.`)
    : `${company} laisse probablement filer des clients à cause de ${primaryAngle.dailyPain} — c'est là qu'on peut débloquer le plus de valeur en premier.`

  // ---- Script d'appel personnalisé ----
  const roleTag = input.contactRole ? ` (${input.contactRole})` : ""
  const angleDiscoveryQuestion: Record<AngleKey, string> = {
    presence: hasSite ? `Votre site actuel, il vous ramène des demandes concrètes (appels, devis) ou c'est plutôt une vitrine ?` : `Vous avez déjà pensé à un site, ou vous fonctionnez surtout au bouche-à-oreille ?`,
    acquisition: `Sur 10 clients qui vous trouvent aujourd'hui, combien viennent de Google plutôt que du bouche-à-oreille ?`,
    automatisation: `Quand un client vous contacte en dehors de vos horaires, ça se passe comment concrètement — il attend, ou il essaie ailleurs ?`,
    metier: `Aujourd'hui, où est-ce que vous notez le suivi de vos clients et de vos dossiers en cours — un outil, ou plutôt mails/WhatsApp/carnet ?`,
    studio: `Vos visuels actuels (site, réseaux), c'est vous qui les faites, ou personne n'a vraiment le temps de s'en occuper ?`,
    hebergement: `Si votre site ou vos outils tombaient en panne demain, qui s'en rendrait compte en premier — vous, ou un client qui vous le dirait ?`,
  }

  const callScript: CallScript = {
    greeting: `${greetingLine(firstName)} je suis ${REP_FIRST_NAME} de Purity Agency, une agence web basée en Wallonie. Je tombe bien, ${firstName ?? "vous avez"} deux minutes ?`,
    hook,
    permission: `Je ne vais pas vous vendre quoi que ce soit au téléphone — je voulais juste vous montrer ce que j'ai repéré, et si ça vous parle, on en reparle. Ça vous va ?`,
    discovery: [
      `Aujourd'hui, comment vos nouveaux clients vous trouvent — bouche-à-oreille, Google, réseaux ?`,
      angleDiscoveryQuestion[primaryAngle.key],
      `Si demain vous gagniez 2 à 3 clients de plus par semaine, ça changerait quoi pour ${company} ?`,
      `Qui décide chez vous sur ce genre de sujet — c'est vous${roleTag ? "" : ""} ou il y a quelqu'un d'autre à impliquer ?`,
    ],
    pitch: `Nous, chez Purity, on fait une chose simple : on trouve le levier qui vous rapporte le plus de clients le plus vite, et on s'en occupe de bout en bout — site, référencement, automatisation ou outils métier selon ce qui compte pour vous. Vous n'avez rien à gérer.`,
    bridgeToValue: valueProps.slice(0, 3).map((v) => `${v.title} — ${v.detail}`),
    objections: [
      primaryAngle.key === "presence"
        ? { trigger: "« J'ai déjà un site »", response: `C'est justement pour ça que je vous appelle : le vôtre existe, mais ${band(perf) === "critique" || band(seo) === "critique" ? "il ne travaille pas pour vous (trop lent / invisible sur Google)" : "il pourrait convertir beaucoup plus"}. On ne repart pas de zéro, on le transforme en machine à demandes.` }
        : primaryAngle.objection,
      { trigger: "« Ça coûte cher »", response: `Je comprends. La vraie question, c'est le retour : un seul client supplémentaire par mois rembourse souvent l'investissement. Et on a des formules adaptées aux artisans et indépendants${where}. On regarde ensemble ce qui a du sens pour vous, sans engagement.` },
      { trigger: "« Je n'ai pas le temps »", response: `C'est exactement pour ça qu'on existe : vous n'avez rien à faire. On conçoit, on configure, on met en ligne. Vous validez en 10 minutes. Le temps, c'est nous qui le prenons.` },
      { trigger: "« Envoyez-moi un mail »", response: `Avec plaisir, je vous envoie un récap clair juste après. Pour que ce soit utile et pas un mail de plus : c'est quoi la meilleure adresse, et je vous appelle jeudi pour votre avis, ça marche ?` },
      { trigger: "« Je vais réfléchir »", response: `Bien sûr. Pour vous aider à décider, je vous propose un truc simple : un mini-audit gratuit de votre présence en ligne, écrit noir sur blanc. Vous le lisez tranquillement. Je vous l'envoie ?` },
    ],
    close: `Je vous propose un appel de 20 minutes${input.contactName ? `, ${firstName}` : ""} — je vous montre précisément quoi prioriser pour ${company}, sans engagement. Vous préférez plutôt en début ou en fin de semaine ?`,
    voicemail: `${greetingLine(firstName)} c'est ${REP_FIRST_NAME} de Purity Agency. J'ai repéré un point précis sur ${company} qui vous fait sûrement perdre des clients, et c'est simple à corriger. Rappelez-moi au ${REP_PHONE} ou je retente demain. Bonne journée${firstName ? `, ${firstName}` : ""} !`,
  }

  // ---- Dossier prospect (ce qu'on sait, pour arriver préparé) ----
  const dossier: DossierRow[] = [
    { label: "Entreprise", value: company },
    { label: "Secteur", value: input.sector || "—" },
    { label: "Zone", value: input.location || "—" },
    { label: "Site", value: input.websiteUrl ? input.websiteUrl.replace(/^https?:\/\/(www\.)?/, "") : "aucun site" },
    { label: "Interlocuteur", value: input.contactName ? `${input.contactName}${input.contactRole ? ` (${input.contactRole})` : ""}` : "inconnu — demander qui décide" },
    { label: "Perf. mobile", value: perf !== null ? `${perf}/100` : "non mesurée" },
    { label: "SEO", value: seo !== null ? `${seo}/100` : "non mesuré" },
    { label: "Point de bascule", value: worst.title },
  ]

  // ---- Psychologie appliquée (cadres réels, personnalisés à ce prospect) ----
  const psychology: PsychTactic[] = [
    {
      name: "Audit d'accusation",
      source: "Chris Voss — Never Split the Difference (FBI)",
      when: "Dès l'ouverture, pour désamorcer la méfiance avant qu'elle ne monte.",
      example: `« Vous allez sûrement vous dire : encore un qui veut me vendre un site. C'est justement pas mon but. » — nommer l'objection la vide de sa force.`,
    },
    {
      name: "Question orientée « non »",
      source: "Chris Voss",
      when: "À l'ouverture. Un « non » rassure et redonne le contrôle au prospect.",
      example: `« Est-ce que je tombe à un mauvais moment ? » plutôt que « vous avez 2 minutes ? ». Le « non » ouvre la conversation au lieu de la fermer.`,
    },
    {
      name: "Étiquetage émotionnel (labeling)",
      source: "Chris Voss",
      when: "Quand le prospect hésite ou résiste. Nommer son émotion la désamorce.",
      example: `« On dirait que le digital n'est pas vraiment votre priorité en ce moment… » puis SILENCE. Laissez-le compléter.`,
    },
    {
      name: "Aversion à la perte",
      source: "Kahneman & Tversky — Prospect Theory (une perte pèse ~2× un gain)",
      when: "Dans l'accroche et le pitch. Parlez de ce qu'il PERD, pas de ce qu'il gagnerait.",
      example: hasSite
        ? `« Chaque semaine, des gens qui cherchent ${sector}${where} tombent sur vos concurrents parce que votre site ${band(perf) === "critique" ? "est trop lent" : "n'est pas visible"}. » Le client perdu marque plus que le client gagné.`
        : `« Sans site, les clients qui vous cherchent en ligne atterrissent chez vos concurrents. C'est du chiffre qui part chaque semaine. »`,
    },
    {
      name: "Preuve sociale",
      source: "Robert Cialdini — Influence",
      when: "Quand il doute de la faisabilité ou du sérieux.",
      example: `« On vient de refaire le site d'un(e) ${sector.toLowerCase()} ${input.location ? `sur ${input.location}` : "en Wallonie"}, ils reçoivent nettement plus de demandes qu'avant. » (Cite un cas réel dès que tu en as un.)`,
    },
    {
      name: "Micro-engagements (cohérence)",
      source: "Robert Cialdini",
      when: "Tout au long. Enchaîner des petits « oui » mène au grand oui.",
      example: `« Vous seriez d'accord pour dire qu'un client de plus par semaine, ça vaut le coup d'y regarder ? » → petit oui → RDV.`,
    },
    {
      name: "Ancrage par la donnée précise",
      source: "Cialdini (autorité) + effet de spécificité",
      when: "Dans l'accroche. Un chiffre exact = crédibilité immédiate.",
      example: perf !== null ? `« Votre site est à ${perf}/100 en vitesse mobile chez Google. » Un chiffre précis prouve que vous avez vraiment regardé.` : `Cite un fait précis observé sur leur présence en ligne — la spécificité crée la crédibilité.`,
    },
    {
      name: "Découverte SPIN",
      source: "Neil Rackham — SPIN Selling",
      when: "Phase de découverte : faire dire au prospect lui-même le coût du problème.",
      example: `Situation → Problème → Implication (« ça vous coûte combien de clients, à votre avis ? ») → Bénéfice (« et si on réglait ça ? »).`,
    },
  ]

  // ---- Mécanique de l'appel (données Gong.io + bonnes pratiques) ----
  const mechanics: CallMechanics = {
    talkListen: "Vise ~43 % de parole / 57 % d'écoute (analyse Gong.io de 25 000+ appels gagnants). Tu poses, il parle.",
    monologueMax: "Aucun monologue > 30-40 s. Si tu dépasses, tu perds l'attention — repasse-lui la parole par une question.",
    questionTarget: "Vise 3 à 4 vraies questions de découverte avant de parler de toi.",
    bestWindow: "Meilleurs créneaux B2B : mardi-jeudi, 8h-9h ou 16h-17h. Évite lundi matin et vendredi après-midi.",
    persistence: "Il faut souvent 6+ tentatives pour joindre un décideur. Un « pas maintenant » n'est pas un « non » — planifie le rappel.",
    tone: "Souris en parlant (ça s'entend), ralentis, fais des silences. Le silence après une question fait parler l'autre.",
  }

  const openers = {
    noOriented: `Bonjour${firstName ? ` ${firstName}` : ""}, ${REP_FIRST_NAME} de Purity Agency. Est-ce que je tombe à un mauvais moment ?`,
    accusationAudit: `Bonjour${firstName ? ` ${firstName}` : ""}, ${REP_FIRST_NAME} de Purity. Vous allez sûrement vous dire « encore un appel commercial » — c'est justement pas le but. J'ai vu un truc précis sur ${company} et je voulais juste vous le signaler.`,
    patternInterrupt: hook,
  }

  const afterCall: string[] = [
    "Noter le résultat MAINTENANT (à chaud) : RDV / rappeler le … / mail / pas intéressé.",
    "Si intéressé : envoyer le PDF d'audit dans l'heure (réciprocité + fer chaud).",
    "Planifier tde suite le prochain contact (date précise, pas « je rappellerai »).",
    "Mettre à jour le statut du lead dans le CRM.",
    "Noter 1 chose apprise sur lui (à réutiliser au prochain contact).",
  ]

  const channelScripts = buildChannelScripts({ firstName, company, primaryAngle })

  return {
    firstName,
    scores: { performance: perf, seo, accessibility: a11y, bestPractices: bp },
    findings,
    valueProps,
    oneLiner,
    callScript,
    hasPhone: !!input.contactPhone,
    vitals,
    dossier,
    psychology,
    mechanics,
    openers,
    afterCall,
    angles,
    alternateAngles,
    archetype,
    serviceRecommendation,
    lossEstimate,
    channelScripts,
  }
}
