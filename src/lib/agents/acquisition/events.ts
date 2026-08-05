import { DomainEvent } from '@/core/events/DomainEvent';

export class LeadCapturedEvent extends DomainEvent {
  constructor(public readonly leadId: string) {
    super('LeadCaptured');
  }
}

export class DraftReviewedEvent extends DomainEvent {
  constructor(
    public readonly leadId: string,
    public readonly companyName: string,
    public readonly action: 'APPROVED' | 'REJECTED'
  ) {
    super('DraftReviewed');
  }
}
