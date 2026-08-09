import { NextResponse } from "next/server"
import { runKernel } from "@/core/kernel/runKernel"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // certaines tâches déclenchent des agents LLM (throttle Gemini)

// Worker du kernel : à chaque tick, consomme la file AgentTask et route les
// tâches vers l'exécuteur de leur pôle. C'est le cœur qui fait circuler le
// travail entre pôles. Protégé par CRON_SECRET (Vercel Cron).
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 500 })
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const result = await runKernel()
  return NextResponse.json({ status: "ok", ...result })
}
