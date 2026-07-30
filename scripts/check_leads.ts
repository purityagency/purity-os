import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const leads = await prisma.lead.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  console.log("Derniers leads:", JSON.stringify(leads, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
