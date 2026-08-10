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

  // ---- One-liner de valeur ----
  const worst = findings.find((f) => f.severity === "critique") ?? findings[0]
  const oneLiner = !hasSite
    ? `${company} n'apparaît pas en ligne quand ses futurs clients la cherchent — on change ça avec un site qui attire et convertit.`
    : `${company} a un vrai potentiel en ligne inexploité (${worst.title.toLowerCase()}) — on le débloque pour transformer plus de visiteurs en clients.`

  // ---- Vitals lisibles ----
  const vitals = (psi?.coreWebVitals ?? []).map((m) => ({ title: m.title, value: m.displayValue, good: m.score === null ? null : m.score >= 0.9 }))

  // ---- Script d'appel personnalisé ----
  const roleTag = input.contactRole ? ` (${input.contactRole})` : ""
  const hookByFinding = (() => {
    if (!hasSite) return `Je vous appelle parce que j'ai cherché ${company} en ligne et, très franchement, je ne vous ai pas trouvé — alors que vos concurrents${where}, oui. J'imagine que des clients passent à côté de vous sans le savoir.`
    if (band(perf) === "critique") return `J'ai regardé le site de ${company} ce matin, et il y a un truc qui m'a sauté aux yeux : sur mobile, il met un temps fou à s'afficher (${perf}/100 chez Google). En clair, une bonne partie de vos visiteurs partent avant de voir quoi que ce soit.`
    if (band(seo) === "critique") return `J'ai regardé la présence en ligne de ${company}, et le point qui coince, c'est Google : quand on cherche vos services${where}, vous n'apparaissez quasiment pas (${seo}/100). Vos futurs clients tombent sur les autres.`
    return `J'ai pris deux minutes pour regarder le site de ${company}, et il y a clairement de quoi capter plus de clients avec quelques ajustements ciblés.`
  })()

  const callScript: CallScript = {
    greeting: `${greetingLine(firstName)} je suis ${REP_FIRST_NAME} de Purity Agency, une agence web basée en Wallonie. Je tombe bien, ${firstName ?? "vous avez"} deux minutes ?`,
    hook: hookByFinding,
    permission: `Je ne vais pas vous vendre quoi que ce soit au téléphone — je voulais juste vous montrer ce que j'ai repéré, et si ça vous parle, on en reparle. Ça vous va ?`,
    discovery: [
      `Aujourd'hui, comment vos nouveaux clients vous trouvent — bouche-à-oreille, Google, réseaux ?`,
      hasSite ? `Votre site actuel, il vous ramène des demandes concrètes (appels, devis) ou c'est plutôt une vitrine ?` : `Vous avez déjà pensé à un site, ou vous fonctionnez surtout au bouche-à-oreille ?`,
      `Si demain vous aviez 2 à 3 demandes de plus par semaine via le web, ça changerait quoi pour ${company} ?`,
      `Qui décide chez vous sur ce genre de sujet — c'est vous${roleTag ? "" : ""} ou il y a quelqu'un d'autre à impliquer ?`,
    ],
    pitch: `Nous, chez Purity, on fait une chose simple : des sites rapides, bien référencés localement, et pensés pour transformer les visiteurs en clients. Pas de l'art pour l'art — un outil qui vous ramène des demandes. Et on s'occupe de tout, vous n'avez rien à gérer.`,
    bridgeToValue: valueProps.slice(0, 3).map((v) => `${v.title} — ${v.detail}`),
    objections: [
      { trigger: "« J'ai déjà un site »", response: `C'est justement pour ça que je vous appelle : le vôtre existe, mais ${band(perf) === "critique" || band(seo) === "critique" ? "il ne travaille pas pour vous (trop lent / invisible sur Google)" : "il pourrait convertir beaucoup plus"}. On ne repart pas de zéro, on le transforme en machine à demandes.` },
      { trigger: "« Ça coûte cher »", response: `Je comprends. La vraie question, c'est le retour : un seul client supplémentaire par mois rembourse souvent le site. Et on a des formules adaptées aux artisans et indépendants${where}. On regarde ensemble ce qui a du sens pour vous, sans engagement.` },
      { trigger: "« Je n'ai pas le temps »", response: `C'est exactement pour ça qu'on existe : vous n'avez rien à faire. On rédige, on conçoit, on met en ligne. Vous validez en 10 minutes. Le temps, c'est nous qui le prenons.` },
      { trigger: "« Envoyez-moi un mail »", response: `Avec plaisir, je vous envoie un récap clair juste après. Pour que ce soit utile et pas un mail de plus : c'est quoi la meilleure adresse, et je vous appelle jeudi pour votre avis, ça marche ?` },
      { trigger: "« Je vais réfléchir »", response: `Bien sûr. Pour vous aider à décider, je vous propose un truc simple : un mini-audit gratuit de votre présence en ligne, écrit noir sur blanc. Vous le lisez tranquillement. Je vous l'envoie ?` },
    ],
    close: `Je vous propose un appel de 20 minutes${input.contactName ? `, ${firstName}` : ""} — je vous montre précisément quoi prioriser pour ${company}, sans engagement. Vous préférez plutôt en début ou en fin de semaine ?`,
    voicemail: `${greetingLine(firstName)} c'est ${REP_FIRST_NAME} de Purity Agency. J'ai repéré un point précis sur la présence en ligne de ${company} qui vous fait sûrement perdre des clients, et c'est simple à corriger. Rappelez-moi au ${REP_PHONE} ou je retente demain. Bonne journée${firstName ? `, ${firstName}` : ""} !`,
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
    patternInterrupt: hookByFinding,
  }

  const afterCall: string[] = [
    "Noter le résultat MAINTENANT (à chaud) : RDV / rappeler le … / mail / pas intéressé.",
    "Si intéressé : envoyer le PDF d'audit dans l'heure (réciprocité + fer chaud).",
    "Planifier tde suite le prochain contact (date précise, pas « je rappellerai »).",
    "Mettre à jour le statut du lead dans le CRM.",
    "Noter 1 chose apprise sur lui (à réutiliser au prochain contact).",
  ]

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
  }
}
