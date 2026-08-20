import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { classifyEmail, estimateCompanySize } from '../src/lib/agents/acquisition/IntelligenceAnalyst';

// Re-qualification de la base EXISTANTE avec la nouvelle logique décideur/canal.
// 100% déterministe — AUCUN appel LLM (donc zéro coût). Ne re-crawle pas les
// sites : reclasse les emails déjà stockés + pose emailQuality / contactChannel /
// priorityBand dans auditData (fusion, jamais d'écrasement du reste).
async function main() {
  const dry = process.argv.includes('--dry');
  const leads = await prisma.lead.findMany({
    where: { optedOut: false },
    select: { id: true, contactEmail: true, score: true, auditData: true },
  });

  const tally: Record<string, number> = { nominative: 0, role: 0, generic: 0, none: 0, EMAIL: 0, PHONE: 0, NONE: 0, HOT: 0, WARM: 0, COLD: 0 };
  let updated = 0;

  for (const l of leads) {
    const audit = (l.auditData as Record<string, unknown> | null) ?? {};
    const hasPhone = !!audit.contactPhone;

    let emailQuality: string | null = null;
    if (l.contactEmail) {
      const domain = l.contactEmail.split('@')[1] ?? '';
      const brand = domain.split('.').slice(0, -1).filter((t) => t.length >= 3 && t !== 'www');
      emailQuality = classifyEmail(l.contactEmail, brand);
    }
    tally[emailQuality ?? 'none']++;

    const emailUsable = emailQuality === 'nominative' || emailQuality === 'role';
    const contactChannel: 'EMAIL' | 'PHONE' | 'NONE' = emailUsable ? 'EMAIL' : hasPhone ? 'PHONE' : 'NONE';
    tally[contactChannel]++;

    const reachable = contactChannel !== 'NONE';
    const score = l.score ?? 0;
    const priorityBand = score >= 70 && reachable ? 'HOT' : (score >= 45 && reachable) || (score >= 70 && !reachable) ? 'WARM' : 'COLD';
    tally[priorityBand]++;

    if (!dry) {
      await prisma.lead.update({
        where: { id: l.id },
        data: { auditData: { ...audit, emailQuality, contactChannel, priorityBand } as object },
      });
    }
    updated++;
  }

  const n = leads.length;
  const pct = (x: number) => `${((x / n) * 100).toFixed(0)}%`;
  console.log(`\n════════ RE-QUALIFICATION ${dry ? '(DRY-RUN)' : ''} — ${n} leads ════════\n`);
  console.log(`Email  🎯 nominatif: ${tally.nominative} (${pct(tally.nominative)}) · rôle: ${tally.role} · ❌ générique: ${tally.generic} (${pct(tally.generic)}) · sans email: ${tally.none}`);
  console.log(`Canal  EMAIL: ${tally.EMAIL} (${pct(tally.EMAIL)}) · PHONE: ${tally.PHONE} (${pct(tally.PHONE)}) · NONE: ${tally.NONE} (${pct(tally.NONE)})`);
  console.log(`Bande  🔥 HOT: ${tally.HOT} · WARM: ${tally.WARM} · COLD: ${tally.COLD}`);
  console.log(`\n${dry ? 'Aucune écriture (dry-run).' : `✅ ${updated} leads re-qualifiés.`}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
