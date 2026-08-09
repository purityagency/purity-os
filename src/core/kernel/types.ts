import type { DepartmentId } from "@/core/departments"

// Une tâche telle que vue par un exécuteur (sous-ensemble du modèle Prisma).
export interface KernelTask {
  id: string
  department: DepartmentId
  task: string
  data: Record<string, unknown>
}

// Contrat d'observation (skill agent-harness-construction) : un exécuteur
// renvoie TOUJOURS un statut clair + un résumé d'une ligne, jamais une
// exception silencieuse. `retry: true` demande une nouvelle tentative plus tard.
export type KernelResult =
  | { status: "done"; summary: string; data?: Record<string, unknown> }
  | { status: "failed"; summary: string; retry?: boolean }

// Un exécuteur de pôle : reçoit une tâche, agit, renvoie un résultat typé.
export type TaskExecutor = (task: KernelTask) => Promise<KernelResult>
