import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import { prisma } from './src/lib/prisma'

async function main() {
  const drafts = await prisma.emailDraft.deleteMany()
  const leads = await prisma.lead.deleteMany()
  const missions = await prisma.mission.deleteMany()
  console.log(`Cleared: ${drafts.count} drafts, ${leads.count} leads, ${missions.count} missions.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
