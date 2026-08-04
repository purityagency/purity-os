import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }
const connectionString = process.env.DATABASE_URL

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

if (!connectionString && !isBuildPhase) {
  throw new Error("DATABASE_URL is not configured")
}

const activeConnectionString = connectionString || "postgresql://dummy:dummy@localhost:5432/dummy"

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: activeConnectionString }),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
