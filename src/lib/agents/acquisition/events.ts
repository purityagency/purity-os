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

// Un prospect a répondu et le webhook a déjà classifié + persisté la réponse
// (voir /api/webhooks/inbound-email) — ce n'est publié QUE pour les intentions
// qui méritent une réponse rédigée (interested/objection/other), jamais pour
// opt_out (aucune réponse) ni auto_reply (absence automatique, pas un humain).
export class LeadRepliedEvent extends DomainEvent {
  constructor(
    public readonly leadId: string,
    public readonly replyText: string,
    public readonly replySubject: string,
  ) {
    super('LeadReplied');
  }
}
