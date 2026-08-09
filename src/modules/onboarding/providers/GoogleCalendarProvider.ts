import { ICalendarProvider } from '@/core/providers';
import { logger } from '@/core/logger';
import { prisma } from '@/lib/prisma';

/**
 * Planification du kickoff client. L'ancienne version throwait sans
 * GOOGLE_CALENDAR_API_KEY (absente) et son implémentation était vide.
 *
 * Fix avec ce qu'on a : on PERSISTE le kickoff à planifier comme Event lié au
 * projet — l'admin le voit dans son fil et l'ajoute à son agenda. Non bloquant.
 * Le jour où la vraie intégration Google Calendar (compte de service, comme le
 * widget de réservation du site) est câblée, on remplace le corps ici.
 */
export class GoogleCalendarProvider implements ICalendarProvider {
  async scheduleKickoff(projectId: string, date: Date): Promise<void> {
    try {
      await prisma.event.create({
        data: {
          type: 'SYSTEM',
          name: 'Kickoff à planifier',
          summary: `Réunion de lancement à caler pour ${date.toLocaleDateString('fr-BE')}`.slice(0, 200),
          projectId,
          payload: { projectId, kickoffDate: date.toISOString(), needsScheduling: true },
        },
      });
      logger.info(`[Calendar] Kickoff du projet ${projectId} enregistré (à planifier le ${date.toISOString()}).`);
    } catch (e) {
      logger.error(`[Calendar] Échec enregistrement kickoff projet ${projectId}`, e);
    }
  }
}
