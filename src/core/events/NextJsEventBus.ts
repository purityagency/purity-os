import { after } from 'next/server';
import { DomainEvent } from './DomainEvent';
import { EventBus, EventHandler } from './EventBus';
import { logger } from '../logger';

export class NextJsEventBus implements EventBus {
  private handlers = new Map<string, EventHandler<DomainEvent>[]>();

  publish(event: DomainEvent): void {
    const currentHandlers = this.handlers.get(event.eventName) || [];
    if (currentHandlers.length === 0) return;

    after(async () => {
      logger.info(`[EventBus] Processing event ${event.eventName}`, { eventId: event.id });
      try {
        await Promise.allSettled(currentHandlers.map(h => h(event)));
        logger.info(`[EventBus] Completed event ${event.eventName}`, { eventId: event.id });
      } catch (err) {
        logger.error(`[EventBus] Error in event ${event.eventName}`, err, { eventId: event.id });
      }
    });
  }

  subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void {
    const currentHandlers = this.handlers.get(eventName) || [];
    this.handlers.set(eventName, [...currentHandlers, handler as EventHandler<DomainEvent>]);
  }
}

export const eventBus = new NextJsEventBus();
