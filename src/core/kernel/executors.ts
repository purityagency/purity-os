import type { DepartmentId } from "@/core/departments"
import type { KernelTask, KernelResult, TaskExecutor } from "./types"

// Registre des exécuteurs par pôle. On ne branche QUE les pôles dotés d'une
// vraie capacité aujourd'hui ; les autres tombent sur un exécuteur "non encore
// câblé" qui échoue proprement (jamais de crash). Brancher un pôle = ajouter
// son exécuteur ici, sans toucher au moteur.

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : ""
}
function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map(str).filter(Boolean) : []
}

// 01_ACQUISITION — lance une mission de prospection (Chief → Market Scout).
const acquisitionExecutor: TaskExecutor = async (t: KernelTask): Promise<KernelResult> => {
  const sectors = strArray(t.data.sectors)
  const locations = strArray(t.data.locations)
  if (sectors.length === 0 || locations.length === 0) {
    return { status: "failed", summary: "Tâche acquisition sans secteurs/villes exploitables." }
  }
  const maxLeads = Number(t.data.maxLeads) || 10
  const name = str(t.data.name) || t.task.slice(0, 80)

  const { ChiefAcquisitionAI } = await import("@/lib/agents/acquisition/ChiefAcquisitionAI")
  const mission = await new ChiefAcquisitionAI().launchMission(name, sectors, locations, maxLeads)
  return { status: "done", summary: `Mission « ${name} » lancée`, data: { missionId: mission.id } }
}

// 02_FINANCE_ADMIN — génère une facture (brouillon) pour un projet.
const financeExecutor: TaskExecutor = async (t: KernelTask): Promise<KernelResult> => {
  const projectId = str(t.data.projectId)
  const kindRaw = str(t.data.kind).toUpperCase()
  const kind = (["DEPOSIT", "BALANCE", "FULL"] as const).find((k) => k === kindRaw)
  if (!projectId || !kind) {
    return { status: "failed", summary: "Tâche finance sans projectId ou kind (DEPOSIT/BALANCE/FULL) valide." }
  }
  const { InvoiceAgent } = await import("@/lib/agents/finance/InvoiceAgent")
  const invoice = await new InvoiceAgent().generateInvoice(projectId, kind, str(t.data.paymentId) || undefined)
  return { status: "done", summary: `Facture ${invoice.invoiceNumber} générée (${invoice.totalAmount}€)`, data: { invoiceId: invoice.id } }
}

// Pôles pas encore câblés : échec propre et explicite (pas un crash), pour que
// la tâche soit visible comme "en attente d'implémentation" plutôt que perdue.
const notWiredExecutor: TaskExecutor = async (t: KernelTask): Promise<KernelResult> => {
  return { status: "failed", summary: `Aucun exécuteur câblé pour le pôle ${t.department} (tâche enregistrée, en attente d'activation).` }
}

const EXECUTORS: Partial<Record<DepartmentId, TaskExecutor>> = {
  "01_ACQUISITION": acquisitionExecutor,
  "02_FINANCE_ADMIN": financeExecutor,
}

export function getExecutor(department: DepartmentId): TaskExecutor {
  return EXECUTORS[department] ?? notWiredExecutor
}

// Pôles réellement exécutables aujourd'hui (pour l'observabilité / l'UI).
export const WIRED_DEPARTMENTS = Object.keys(EXECUTORS) as DepartmentId[]
