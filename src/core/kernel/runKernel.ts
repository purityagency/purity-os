import { prisma } from "@/lib/prisma"
import { logger } from "@/core/logger"
import { resolveDepartment } from "@/core/departments"
import { getExecutor } from "./executors"
import type { KernelTask } from "./types"

const MAX_ATTEMPTS = 3
// Priorité d'exécution : les tâches critiques passent devant.
const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 }

function backoffMs(attempt: number): number {
  return Math.min(30 * 60_000, 60_000 * 2 ** attempt) // 2min, 4min, 8min… plafonné à 30min
}

/**
 * Worker du kernel : consomme la file AgentTask, route chaque tâche vers
 * l'exécuteur de son pôle, enregistre le résultat. Idempotent (réclamation
 * atomique PENDING→RUNNING) et tolérant aux pannes (retry avec backoff).
 * Plafonné par exécution pour respecter la durée de fonction / le quota LLM.
 */
export async function runKernel(maxTasks = 8): Promise<{ processed: number; done: number; failed: number }> {
  const now = new Date()
  const candidates = await prisma.agentTask.findMany({
    where: { status: "PENDING", scheduledFor: { lte: now } },
    take: maxTasks * 3, // marge : certaines réclamations peuvent échouer (concurrence)
  })

  candidates.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2))

  let processed = 0
  let done = 0
  let failed = 0

  for (const t of candidates) {
    if (processed >= maxTasks) break

    // Réclamation atomique : un seul worker peut passer PENDING→RUNNING.
    const claim = await prisma.agentTask.updateMany({
      where: { id: t.id, status: "PENDING" },
      data: { status: "RUNNING", attempts: { increment: 1 } },
    })
    if (claim.count !== 1) continue // déjà pris par un autre passage
    processed++

    const department = resolveDepartment(t.department)
    const attempt = t.attempts + 1

    try {
      if (!department) {
        await prisma.agentTask.update({
          where: { id: t.id },
          data: { status: "FAILED", error: `Département inconnu: ${t.department}` },
        })
        failed++
        continue
      }

      const kernelTask: KernelTask = {
        id: t.id,
        department,
        task: t.task,
        data: (t.data && typeof t.data === "object" ? t.data : {}) as Record<string, unknown>,
      }

      const result = await getExecutor(department)(kernelTask)

      if (result.status === "done") {
        await prisma.agentTask.update({
          where: { id: t.id },
          data: { status: "DONE", result: (result.data ?? {}) as object, error: null },
        })
        done++
        logger.info(`[Kernel] ${department} ✓ ${result.summary}`, { taskId: t.id })
      } else if (result.retry && attempt < MAX_ATTEMPTS) {
        await prisma.agentTask.update({
          where: { id: t.id },
          data: { status: "PENDING", scheduledFor: new Date(Date.now() + backoffMs(attempt)), error: result.summary },
        })
        logger.warn(`[Kernel] ${department} retry (${attempt}/${MAX_ATTEMPTS}): ${result.summary}`, { taskId: t.id })
      } else {
        await prisma.agentTask.update({
          where: { id: t.id },
          data: { status: "FAILED", error: result.summary },
        })
        failed++
        logger.warn(`[Kernel] ${department} ✗ ${result.summary}`, { taskId: t.id })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // Exception = retryable tant qu'on a des tentatives.
      if (attempt < MAX_ATTEMPTS) {
        await prisma.agentTask
          .update({ where: { id: t.id }, data: { status: "PENDING", scheduledFor: new Date(Date.now() + backoffMs(attempt)), error: message } })
          .catch(() => {})
      } else {
        await prisma.agentTask.update({ where: { id: t.id }, data: { status: "FAILED", error: message } }).catch(() => {})
        failed++
      }
      logger.error(`[Kernel] ${t.department} exception (${attempt}/${MAX_ATTEMPTS})`, err)
    }
  }

  return { processed, done, failed }
}
