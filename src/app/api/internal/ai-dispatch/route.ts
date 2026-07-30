import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalSecret, readSignedBody } from "@/lib/internalAuth"
import {
  resolveDepartment,
  departmentLabel,
  isTaskPriority,
  DEFAULT_DEPARTMENT,
  DEFAULT_PRIORITY,
} from "@/core/departments"

export async function POST(request: Request) {
  try {
    const { rawText, body } = await readSignedBody(request)
    if (!verifyInternalSecret(request, rawText)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    // Un pôle inconnu est rejeté explicitement plutôt que silencieusement
    // réattribué au COO : une mission qui part au mauvais endroit est plus
    // coûteuse à diagnostiquer qu'un 400 immédiat.
    const department = body.department === undefined || body.department === null
      ? DEFAULT_DEPARTMENT
      : resolveDepartment(body.department)

    if (!department) {
      return NextResponse.json({ error: "invalid_department" }, { status: 400 })
    }

    const task = String(body.task || "").trim().slice(0, 500)
    if (!task) {
      return NextResponse.json({ error: "missing_task" }, { status: 400 })
    }

    const rawPriority = String(body.priority ?? DEFAULT_PRIORITY).trim().toUpperCase()
    const priority = isTaskPriority(rawPriority) ? rawPriority : DEFAULT_PRIORITY

    const data = body.data && typeof body.data === "object" ? body.data : {}

    const event = await prisma.event.create({
      data: {
        type: "AI",
        name: departmentLabel(department),
        summary: `[${priority}] ${task}`,
        payload: {
          department,
          task,
          priority,
          data,
          status: "DISPATCHED",
          dispatchedAt: new Date().toISOString(),
        },
      },
    })

    return NextResponse.json(
      { ok: true, eventId: event.id, department, priority, task },
      { status: 200 },
    )
  } catch (error) {
    console.error("[internal-ai-dispatch]", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
