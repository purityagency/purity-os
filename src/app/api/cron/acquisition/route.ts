import { NextResponse } from 'next/server';
import { ChiefAcquisitionAI } from '@/lib/agents/acquisition/ChiefAcquisitionAI';
import { MarketScout } from '@/lib/agents/acquisition/MarketScout';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // secondes — nécessite un plan Vercel qui autorise une durée de fonction étendue, voir README du pôle.

const DAILY_LEAD_QUOTA = 50;

/**
 * Déclenchement planifié du pôle Acquisition — voir vercel.json pour
 * l'horaire (8h puis toutes les heures jusqu'à 17h). Vercel Cron envoie un
 * header `Authorization: Bearer ${CRON_SECRET}` — on le vérifie pour que
 * cette route ne soit pas appelable publiquement par n'importe qui.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré côté serveur' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // COÛT : garde anti double-déclenchement. Des scans partaient en double (même
  // horodatage) → sourcing facturé 2×. Si une mission a déjà été créée dans les
  // 50 dernières minutes, on considère que le scan de ce créneau a déjà tourné.
  const { prisma } = await import("@/lib/prisma");
  const recentScan = await prisma.mission.findFirst({
    where: { createdAt: { gte: new Date(Date.now() - 50 * 60 * 1000) } },
    select: { id: true },
  });
  if (recentScan) {
    return NextResponse.json({ status: "skipped_recent_scan", reason: "un scan a déjà tourné dans les 50 dernières minutes" });
  }

  const alreadyToday = await MarketScout.countLeadsToday();
  const remaining = DAILY_LEAD_QUOTA - alreadyToday;

  if (remaining <= 0) {
    return NextResponse.json({
      status: 'quota_reached',
      leadsToday: alreadyToday,
      quota: DAILY_LEAD_QUOTA,
    });
  }

  const chief = new ChiefAcquisitionAI();
  const result = await chief.runScheduledScan(remaining);

  return NextResponse.json({
    status: 'ok',
    ...result,
    leadsToday: alreadyToday + result.leadsFound,
    quota: DAILY_LEAD_QUOTA,
  });
}
