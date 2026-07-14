import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured")
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: databaseUrl,
    }),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
