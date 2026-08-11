import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { CreativeCopywriter } from '../src/lib/agents/acquisition/CreativeCopywriter';

async function main() {
  // Find an enriched lead or lead with auditData
  const lead = await prisma.lead.findFirst({
    where: { status: 'ENRICHED' }
  }) || await prisma.lead.findFirst({
    where: { auditData: { path: ['painPoints'], not: undefined } }
  });

  if (!lead) {
    console.log('No eligible lead found for test');
    return;
  }

  console.log(`Testing Manon Verhoeven draft generation for lead: ${lead.companyName} (${lead.id})`);
  const copywriter = new CreativeCopywriter();
  const draftId = await copywriter.draftEmail(lead.id);

  if (draftId) {
    const draft = await prisma.emailDraft.findUnique({ where: { id: draftId } });
    console.log('\n--- DRAFT GENERATED SUCCESSFULLY ---');
    console.log('ID:', draft?.id);
    console.log('Subject:', draft?.subject);
    console.log('Tone:', draft?.tone);
    console.log('Body HTML:\n', draft?.bodyHtml);
  } else {
    console.log('Draft generation skipped or blocked.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
