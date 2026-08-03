// Source unique de vérité pour l'identité humaine de chaque agent — nom,
// prénom, fonction réelle. `agentName` doit correspondre EXACTEMENT à la
// chaîne passée à `super(agentName, ...)` dans la classe de l'agent
// (voir src/lib/agents/acquisition/*.ts), c'est la clé utilisée par
// AgentActivity en base. Zéro branding fictif ("Live Matrix", "Command
// Center") — un nom, un poste, un statut réel.

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
    chief: { agentName: "Chief Agency AI", fullName: "Chief Agency AI", role: "Directeur Général", coded: false },
    agents: [],
  },
  {
    id: "01",
    name: "Acquisition",
    chief: { agentName: "Chief Acquisition AI", fullName: "Julien Servais", role: "Directeur Acquisition", coded: true },
    agents: [
      { agentName: "Market Scout", fullName: "Léa Dumont", role: "Chargée de prospection", coded: true },
      { agentName: "Intelligence Analyst", fullName: "Karim Haddad", role: "Analyste Audit & Intelligence", coded: true },
      { agentName: "Creative Copywriter", fullName: "Manon Verhoeven", role: "Rédactrice commerciale", coded: true },
      { agentName: "RevOps Automator", fullName: "Thibault Nguyen", role: "Chargé des opérations commerciales", coded: true },
      { agentName: "Lead Scoring Analyst", fullName: "Yassine Bouzid", role: "Analyste Scoring", coded: true },
      { agentName: "Referral Partnership Agent", fullName: "Emma Lambrecht", role: "Chargée Partenariats & Recommandations", coded: true },
      { agentName: "Ads Strategist", fullName: "Sofia Marchetti", role: "Stratège Publicité", coded: true },
      { agentName: "LinkedIn Outreach Specialist", fullName: "Adam Peeters", role: "Chargé de prospection LinkedIn", coded: true },
      { agentName: "SEO Local Scout", fullName: "Chloé Renard", role: "Chargée SEO Local", coded: true },
    ],
  },
  {
    id: "02",
    name: "Finance & Administration",
    chief: { agentName: "Chief Finance AI", fullName: "Nathalie Coppens", role: "Directrice Finance", coded: false },
    agents: [
      { agentName: "Invoice Agent", fullName: "Bruno Dechamps", role: "Chargé de facturation", coded: true },
      { agentName: "Cashflow Analyst", fullName: "Aïcha Benali", role: "Analyste Trésorerie", coded: false },
      { agentName: "Compliance Bookkeeper", fullName: "Wouter Van Damme", role: "Comptable Conformité", coded: false },
      { agentName: "Payment Reconciliation Agent", fullName: "Sara Michiels", role: "Rapprochement Paiements", coded: false },
      { agentName: "Subscription Lifecycle Agent", fullName: "Loïc Fontaine", role: "Suivi Abonnements", coded: false },
      { agentName: "Expense Auditor", fullName: "Ines Delvaux", role: "Audit des dépenses", coded: false },
      { agentName: "Pricing Analyst", fullName: "Maxime Colin", role: "Analyste Tarification", coded: false },
      { agentName: "Grant & Subsidy Scout", fullName: "Fatima Ouahbi", role: "Chargée Subventions", coded: false },
      { agentName: "Financial Reporting Agent", fullName: "Pieter Claes", role: "Reporting Financier", coded: false },
    ],
  },
  {
    id: "03",
    name: "Opérations & Conformité",
    chief: { agentName: "Chief Ops AI", fullName: "Antoine Lefebvre", role: "Directeur Opérations", coded: false },
    agents: [
      { agentName: "Sentinel", fullName: "Sentinel", role: "Surveillance technique", coded: true },
    ],
  },
  {
    id: "04",
    name: "Production",
    chief: { agentName: "Chief Production AI", fullName: "Camille Dubuisson", role: "Directrice de Production", coded: false },
    agents: [
      { agentName: "Onboarding Orchestrator", fullName: "Onboarding Orchestrator", role: "Chargé d'intégration client", coded: true },
    ],
  },
  {
    id: "05",
    name: "Ventes & Clients",
    chief: { agentName: "Chief Sales AI", fullName: "Vincent Delcourt", role: "Directeur Commercial", coded: false },
    agents: [],
  },
  {
    id: "06",
    name: "Stratégie & Data",
    chief: { agentName: "Chief Strategy AI", fullName: "Océane Dupuis", role: "Directrice Stratégie", coded: false },
    agents: [],
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
