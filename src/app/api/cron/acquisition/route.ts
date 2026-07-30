import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { IntelligenceAnalyst } from '../../../../../../ai/01_ACQUISITION/Intelligence_Analyst/worker';
import { CreativeCopywriter } from '../../../../../../ai/01_ACQUISITION/Creative_Copywriter/worker';
import { AgentLogger } from '@/lib/AgentLogger';

const analyst = new IntelligenceAnalyst();
const copywriter = new CreativeCopywriter();
const logger = new AgentLogger("Chief Acquisition AI", "01_ACQUISITION");

// Ce endpoint est conçu pour être appelé par un Cron (ex: Vercel Cron) toutes les X minutes.
export async function GET(request: Request) {
  try {
    // Vérification du Cron (CRON_SECRET). Fail-closed : si le secret n'est
    // pas configuré, la route refuse plutôt que de tourner sans protection —
    // l'inverse (`if (secret && ...)`) laissait la route ouverte à quiconque
    // tant que la variable d'env n'était pas définie.
    const secret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    await logger.startTask("Démarrage de la boucle de supervision d'acquisition");

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

    await logger.finishTask(`Boucle terminée. Traités: ${newLeads.length} NEW, ${enrichedLeads.length} ENRICHED.`);

    return NextResponse.json({ 
      success: true, 
      processedNew: newLeads.length, 
      processedEnriched: enrichedLeads.length 
    });

  } catch (error: any) {
    await logger.logError(`Erreur critique de la boucle: ${error.message}`);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
