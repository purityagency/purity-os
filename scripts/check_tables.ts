import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log(tables);
}

main().catch(console.error);
