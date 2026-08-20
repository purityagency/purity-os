import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { classifyEmail } from '../src/lib/agents/acquisition/IntelligenceAnalyst';

// Éval "santé du pipeline" (eval-harness) : mesure la qualité de contact réelle
// de la base, avant re-qualification. Aucune écriture, lecture seule.
async function main() {
  const leads = await prisma.lead.findMany({
    where: { optedOut: false },
    select: { companyName: true, contactEmail: true, auditData: true },
  });

  const n = leads.length;
  let email = 0, nominative = 0, role = 0, generic = 0, phone = 0, noContact = 0, decisionReachable = 0;

  for (const l of leads) {
    const audit = (l.auditData ?? {}) as { contactPhone?: string };
    const hasPhone = !!audit.contactPhone;
    if (hasPhone) phone++;
    if (l.contactEmail) {
      email++;
      const domain = l.contactEmail.split('@')[1] ?? '';
      const brand = domain.split('.').slice(0, -1).filter((t) => t.length >= 3 && t !== 'www');
      const q = classifyEmail(l.contactEmail, brand);
      if (q === 'nominative') nominative++;
      else if (q === 'role') role++;
      else generic++;
    }
    const emailUsable = l.contactEmail && classifyEmail(l.contactEmail, []) !== 'generic';
    if (emailUsable || hasPhone) decisionReachable++;
    if (!l.contactEmail && !hasPhone) noContact++;
  }

  const pct = (x: number) => `${((x / n) * 100).toFixed(0)}%`;
  console.log(`\n════════ SANTÉ DU PIPELINE ACQUISITION (${n} leads actifs) ════════\n`);
  console.log(`Avec email                : ${email} (${pct(email)})`);
  console.log(`  ├─ 🎯 nominatif (décideur): ${nominative} (${pct(nominative)})`);
  console.log(`  ├─ rôle-décideur         : ${role} (${pct(role)})`);
  console.log(`  └─ ❌ générique (poubelle): ${generic} (${pct(generic)})`);
  console.log(`Avec téléphone            : ${phone} (${pct(phone)})`);
  console.log(`\n✅ Joignable via un DÉCIDEUR (email nominatif/rôle OU téléphone) : ${decisionReachable} (${pct(decisionReachable)})`);
  console.log(`⚠️  Générique-only sans tél (à re-router ou écarter)            : ${generic - (email && phone ? 0 : 0)} ~`);
  console.log(`💀 Aucun contact du tout                                        : ${noContact} (${pct(noContact)})`);
  console.log(`\nLecture : le % "générique" = autant de mails qui partaient en poubelle avant le fix.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
