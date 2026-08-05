// Source unique de vérité pour l'identité humaine de chaque agent — nom,
// prénom, fonction réelle. `agentName` doit correspondre EXACTEMENT à la
// chaîne passée à `super(agentName, ...)` dans la classe de l'agent
// (voir src/lib/agents/acquisition/*.ts), c'est la clé utilisée par
// AgentActivity en base.

export type PoleId = "00" | "01" | "02" | "03" | "04" | "05" | "06"

export interface AgentIdentity {
  agentName: string // clé technique, doit matcher AgentActivity.agentName
  fullName: string
  role: string
  coded: boolean // false = persona documentée mais aucun worker.ts écrit
}

export interface Pole {
  id: PoleId
  name: string
  chief: AgentIdentity
  agents: AgentIdentity[]
}

export const POLES: Pole[] = [
  {
    id: "00",
    name: "Direction",
    chief: { agentName: "Chief Agency AI", fullName: "Chief Agency AI (COO)", role: "Directeur Général (COO)", coded: true },
    agents: [],
  },
  {
    id: "01",
    name: "Acquisition",
    chief: { agentName: "Chief Acquisition AI", fullName: "Julien Servais", role: "Directeur Acquisition", coded: true },
    agents: [
      { agentName: "Market Scout",                fullName: "Léa Dumont",       role: "Chargée de prospection",                    coded: true  },
      { agentName: "Intelligence Analyst",         fullName: "Karim Haddad",     role: "Analyste Audit & Intelligence",             coded: true  },
      { agentName: "Creative Copywriter",          fullName: "Manon Verhoeven",  role: "Rédactrice commerciale",                    coded: true  },
      { agentName: "RevOps Automator",             fullName: "Thibault Nguyen",  role: "Chargé des opérations commerciales",        coded: true  },
      { agentName: "Lead Scoring Analyst",         fullName: "Yassine Bouzid",   role: "Analyste Scoring",                          coded: true  },
      { agentName: "Referral Partnership Agent",   fullName: "Emma Lambrecht",   role: "Chargée Partenariats & Recommandations",    coded: true  },
      { agentName: "Ads Strategist",               fullName: "Sofia Marchetti",  role: "Stratège Publicité",                        coded: true  },
      { agentName: "LinkedIn Outreach Specialist", fullName: "Adam Peeters",     role: "Chargé de prospection LinkedIn",            coded: true  },
      { agentName: "SEO Local Scout",              fullName: "Chloé Renard",     role: "Chargée SEO Local",                         coded: true  },
    ],
  },
  {
    id: "02",
    name: "Finance & Administration",
    chief: { agentName: "Chief Finance AI", fullName: "Nathalie Coppens", role: "Directrice Finance", coded: true },
    agents: [
      { agentName: "Invoice Agent",                fullName: "Bruno Dechamps",   role: "Chargé de facturation",                     coded: true  },
      { agentName: "Cashflow Analyst",             fullName: "Aïcha Benali",     role: "Analyste Trésorerie",                       coded: true },
      { agentName: "Compliance Bookkeeper",        fullName: "Wouter Van Damme", role: "Comptable Conformité",                       coded: true },
      { agentName: "Payment Reconciliation Agent", fullName: "Sara Michiels",    role: "Rapprochement Paiements",                   coded: true },
      { agentName: "Subscription Lifecycle Agent", fullName: "Loïc Fontaine",    role: "Suivi Abonnements",                         coded: true },
      { agentName: "Expense Auditor",              fullName: "Ines Delvaux",     role: "Audit des dépenses",                        coded: true },
      { agentName: "Pricing Analyst",              fullName: "Maxime Colin",     role: "Analyste Tarification",                     coded: true },
      { agentName: "Grant & Subsidy Scout",        fullName: "Fatima Ouahbi",    role: "Chargée Subventions Wallonie",              coded: true },
      { agentName: "Financial Reporting Agent",    fullName: "Pieter Claes",     role: "Reporting Financier",                       coded: true },
    ],
  },
  {
    id: "03",
    name: "Opérations & Conformité",
    chief: { agentName: "Chief Ops AI", fullName: "Antoine Lefebvre", role: "Directeur Opérations & SecOps", coded: true },
    agents: [
      { agentName: "Sentinel",                     fullName: "Sentinel",         role: "Surveillance technique & Uptime",           coded: true  },
      { agentName: "GDPR & AI Act Auditor",        fullName: "Claire Moreau",    role: "Auditeur Conformité RGPD & AI Act",         coded: true },
      { agentName: "Backup & PRA Guardian",        fullName: "Marc Janssens",    role: "Responsable Sauvegardes & PRA",             coded: true },
      { agentName: "Access & Security Officer",    fullName: "Lucas Bernard",    role: "Gestionnaire Clés & Accès",                 coded: true },
      { agentName: "Infrastructure Monitor",       fullName: "Elena Rossi",      role: "Analyste Performance Serveurs",             coded: true },
    ],
  },
  {
    id: "04",
    name: "Production Digitale",
    chief: { agentName: "Chief Production AI", fullName: "Camille Dubuisson", role: "Directrice de Production", coded: true },
    agents: [
      { agentName: "Onboarding Orchestrator",      fullName: "Onboarding Orchestrator", role: "Chargé d'intégration client",       coded: true  },
      { agentName: "UX/UI Designer Agent",          fullName: "Sébastien Laurent",role: "Designer UI Liquid Glass",                  coded: true },
      { agentName: "Frontend Code Reviewer",       fullName: "Julie Wouters",    role: "Auditeur Qualité Frontend",                 coded: true },
      { agentName: "Backend & Database Architect", fullName: "Thomas Mertens",   role: "Architecte Node & Database",                coded: true },
      { agentName: "QA Test Automation Agent",     fullName: "Laura Devos",      role: "Responsable Tests & Robustesse",            coded: true },
      { agentName: "Deployment & DevOps Specialist",fullName: "Alexandre Pauwels",role: "Chargé Déploiements Vercel/DevOps",        coded: true },
    ],
  },
  {
    id: "05",
    name: "Ventes & Relation Client",
    chief: { agentName: "Chief Sales AI", fullName: "Vincent Delcourt", role: "Directeur Commercial", coded: true },
    agents: [
      { agentName: "Client Success Manager",       fullName: "Charlotte Hermans",role: "Gestionnaire Satisfaction Client",          coded: true },
      { agentName: "Deal Closure Specialist",      fullName: "Nicolas Dumoulin", role: "Spécialiste Devis & Closing",               coded: true },
      { agentName: "NPS & Feedback Analyst",       fullName: "Amélie Jacobs",    role: "Analyste Avis & Recommandations",          coded: true },
      { agentName: "Support Ticket Dispatcher",    fullName: "David Smets",      role: "Support Client & Assistance",               coded: true },
      { agentName: "Upsell & Renewal Advisor",     fullName: "Valérie Coenen",   role: "Conseillère Renouvellements & Upsell",      coded: true },
    ],
  },
  {
    id: "06",
    name: "Stratégie & Data Intelligence",
    chief: { agentName: "Chief Strategy AI", fullName: "Océane Dupuis", role: "Directrice Stratégie & Data", coded: true },
    agents: [
      { agentName: "BI & Revenue Forecaster",       fullName: "Gilles Vanhoof",   role: "Analyste Prévisions & KPIs Agence",         coded: true },
      { agentName: "Competitor Intelligence Scout", fullName: "Pauline Maes",     role: "Veille Concurrentielle Wallonie",           coded: true },
      { agentName: "R&D AI Tech Scout",            fullName: "Maxime Thys",      role: "Veille Modèles & Nouveautés IA",             coded: true },
      { agentName: "Pricing & Offer Optimizer",    fullName: "Céleste Simon",    role: "Optimiseur Offres & Catalogues",            coded: true },
    ],
  },
]

export function findIdentity(agentName: string): { identity: AgentIdentity; pole: Pole } | null {
  for (const pole of POLES) {
    if (pole.chief.agentName === agentName) return { identity: pole.chief, pole }
    const found = pole.agents.find((a) => a.agentName === agentName)
    if (found) return { identity: found, pole }
  }
  return null
}


