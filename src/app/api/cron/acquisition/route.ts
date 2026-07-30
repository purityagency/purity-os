import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { IntelligenceAnalyst } from '../../../../../../ai/01_ACQUISITION/Intelligence_Analyst/worker';
import { CreativeCopywriter } from '../../../../../../ai/01_ACQUISITION/Creative_Copywriter/worker';

const prisma = new PrismaClient();
const analyst = new IntelligenceAnalyst();
const copywriter = new CreativeCopywriter();

// Ce endpoint est conçu pour être appelé par un Cron (ex: Vercel Cron) toutes les X minutes.
export async function GET(request: Request) {
  try {
    // 1. Vérification basique de sécurité pour le Cron (CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('[Orchestrator] Démarrage de la boucle d\'acquisition...');

    // 2. Traiter les Leads "NEW" (Analyse Lighthouse)
    const newLeads = await prisma.lead.findMany({
      where: { status: 'NEW' },
      take: 5 // Batch processing
    });

    for (const lead of newLeads) {
      // Le worker met à jour le statut en 'ENRICHED'
      await analyst.analyzeLead(lead.id);
    }

    // 3. Traiter les Leads "ENRICHED" (Génération Email)
    const enrichedLeads = await prisma.lead.findMany({
      where: { status: 'ENRICHED' },
      take: 5
    });

    for (const lead of enrichedLeads) {
      // Le worker génère un EmailDraft et met à jour le statut en 'DRAFTED'
      await copywriter.draftEmail(lead.id);
    }

    console.log(`[Orchestrator] Boucle terminée. Traités: ${newLeads.length} NEW, ${enrichedLeads.length} ENRICHED.`);

    return NextResponse.json({ 
      success: true, 
      processedNew: newLeads.length, 
      processedEnriched: enrichedLeads.length 
    });

  } catch (error: any) {
    console.error('[Orchestrator] Erreur critique:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
