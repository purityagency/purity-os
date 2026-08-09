import { prisma } from "@/lib/prisma"
import { resolveDepartment, isTaskPriority, DEFAULT_PRIORITY, type DepartmentId } from "@/core/departments"

// Point d'entrée unique pour mettre une tâche dans la file du kernel. Utilisé
// par /api/internal/ai-dispatch ET, à terme, par les pôles entre eux (ex. un
// client provisionné enfile une tâche Production « construire le site » +
// Finance « facturer l'acompte »). C'est le mécanisme qui interconnecte les
// pôles sans qu'ils se connaissent directement.
export async function enqueueTask(input: {
  department: DepartmentId | string
  task: string
  priority?: string
  data?: Record<string, unknown>
  scheduledFor?: Date
}): Promise<{ id: string } | null> {
  const department = resolveDepartment(input.department)
  const task = input.task.trim().slice(0, 500)
  if (!department || !task) return null

  const priority = isTaskPriority(input.priority) ? String(input.priority).toUpperCase() : DEFAULT_PRIORITY

  const created = await prisma.agentTask.create({
    data: {
      department,
      task,
      priority,
      data: (input.data ?? {}) as object,
      ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}),
    },
    select: { id: true },
  })
  return created
}
