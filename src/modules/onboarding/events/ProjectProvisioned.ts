import { DomainEvent } from '@/core/events';

export class ProjectProvisioned extends DomainEvent {
  constructor(
    public readonly projectId: string,
    public readonly sector: string | null
  ) {
    super('ProjectProvisioned');
  }
}
