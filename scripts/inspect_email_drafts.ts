import { prisma } from '../src/lib/prisma';
import { containsPlaceholder, describeForbidden } from '../src/lib/emailPlaceholders';

async function inspectAndCleanDrafts() {
  console.log("🔍 Inspection des brouillons d'emails en base...");

  const drafts = await prisma.emailDraft.findMany({
    include: { lead: true }
  });

  console.log(`Nombre total de brouillons trouvés: ${drafts.length}`);

  let flaggedCount = 0;
  for (const d of drafts) {
    const forbiddenReason = describeForbidden(d.bodyHtml) || (d.bodyHtml.includes('€') ? "contient un prix (€)" : null);
    if (forbiddenReason) {
      flaggedCount++;
      console.log(`⚠️ Brouillon #${d.id} pour "${d.lead.companyName}" rejeté : ${forbiddenReason}`);
      console.log(`   Sujet: ${d.subject}`);
      console.log(`   Extrait: ${d.bodyHtml.slice(0, 120)}...`);

      // Suppression ou mise en statut REJECTED des brouillons non conformes
      await prisma.emailDraft.update({
        where: { id: d.id },
        data: { status: 'REJECTED' }
      });
      console.log(`   -> Statut mis à jour à REJECTED.`);
    }
  }

  console.log(`\n✅ Inspection terminée : ${flaggedCount} brouillon(s) non conforme(s) neutralisé(s).`);
}

inspectAndCleanDrafts()
  .catch(err => console.error("Erreur inspection:", err))
  .finally(() => prisma.$disconnect());
