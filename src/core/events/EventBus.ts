import { DomainEvent } from './DomainEvent';

export interface EventHandler<T extends DomainEvent> {
  (event: T): Promise<void> | void;
}

export interface EventBus {
  publish(event: DomainEvent): void;
  subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void;
}
