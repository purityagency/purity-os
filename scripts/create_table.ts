import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "AgentActivity" (
      "id" TEXT NOT NULL,
      "agentName" TEXT NOT NULL,
      "department" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'IDLE',
      "currentTask" TEXT,
      "lastLog" TEXT,
      "history" JSONB,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "AgentActivity_pkey" PRIMARY KEY ("id")
    );
  `;
  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "AgentActivity_agentName_key" ON "AgentActivity"("agentName");
  `;
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "AgentActivity_department_idx" ON "AgentActivity"("department");
  `;
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "AgentActivity_status_idx" ON "AgentActivity"("status");
  `;
  console.log("Table AgentActivity created!");
}

main().catch(console.error);
