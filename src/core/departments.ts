/**
 * Source unique de vérité des pôles de l'écosystème IA.
 *
 * Toute route, tout agent et tout dashboard qui parle de "département" doit
 * importer d'ici. Dupliquer cette liste ailleurs, c'est garantir qu'elle
 * divergera : c'est exactement ce qui s'était produit entre l'arborescence
 * `/ai/` et la validation de `/api/internal/ai-dispatch`.
 *
 * Les identifiants correspondent 1:1 aux dossiers de `/ai/`.
 */

export const DEPARTMENTS = [
  { id: "00_CHIEF_AGENCY_AI", alias: "COO", label: "COO — Command Center", tagline: "Arbitrage & priorisation" },
  { id: "01_ACQUISITION", alias: "ACQUISITION", label: "Acquisition", tagline: "Le plein d'opportunités" },
  { id: "02_FINANCE_ADMIN", alias: "FINANCE", label: "Finance & Administration", tagline: "Le pilotage financier" },
  { id: "03_OPS_CONFORMITE", alias: "OPS", label: "Ops & Conformité", tagline: "La machine qui sécurise" },
  { id: "04_PRODUCTION_DIGITALE", alias: "PRODUCTION", label: "Production Digitale", tagline: "L'excellence opérationnelle" },
  { id: "05_VENTES_CLIENTS", alias: "VENTES", label: "Ventes & Clients", tagline: "La relation qui fidélise" },
  { id: "06_STRATEGIE_DATA", alias: "STRATEGIE", label: "Stratégie & Data", tagline: "L'intelligence décisionnelle" },
] as const

export type DepartmentId = (typeof DEPARTMENTS)[number]["id"]

export const DEFAULT_DEPARTMENT: DepartmentId = "00_CHIEF_AGENCY_AI"

/** Priorités acceptées par le COO pour arbitrer une mission. */
export const TASK_PRIORITIES = ["LOW", "NORMAL", "HIGH", "CRITICAL"] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]
export const DEFAULT_PRIORITY: TaskPriority = "NORMAL"

const BY_KEY = new Map<string, DepartmentId>()
for (const d of DEPARTMENTS) {
  BY_KEY.set(d.id.toUpperCase(), d.id)
  BY_KEY.set(d.alias.toUpperCase(), d.id)
}

/**
 * Résout un identifiant de pôle depuis une entrée libre (id complet ou alias
 * court, insensible à la casse). Renvoie null si inconnu — l'appelant décide
 * s'il rejette ou s'il retombe sur le COO.
 */
export function resolveDepartment(input: unknown): DepartmentId | null {
  const key = String(input ?? "").trim().toUpperCase()
  if (!key) return null
  return BY_KEY.get(key) ?? null
}

export function departmentLabel(id: DepartmentId): string {
  return DEPARTMENTS.find((d) => d.id === id)?.label ?? id
}

export function isTaskPriority(input: unknown): input is TaskPriority {
  return TASK_PRIORITIES.includes(String(input ?? "").trim().toUpperCase() as TaskPriority)
}
