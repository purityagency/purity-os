import { eventBus } from './NextJsEventBus';
import { onProjectProvisioned } from '@/modules/onboarding/handlers/OnProjectProvisioned';
import { onLeadCaptured } from '@/lib/agents/acquisition/handlers/OnLeadCaptured';
import { onDraftReviewed } from '@/lib/agents/acquisition/handlers/OnDraftReviewed';
import { onLeadReplied } from '@/lib/agents/acquisition/handlers/OnLeadReplied';

const globalForRegistry = global as unknown as { _eventsRegistered?: boolean }

export function bootstrapEvents() {
  if (globalForRegistry._eventsRegistered) return;
  
  eventBus.subscribe('ProjectProvisioned', onProjectProvisioned);
  eventBus.subscribe('LeadCaptured', onLeadCaptured);
  eventBus.subscribe('DraftReviewed', onDraftReviewed);
  eventBus.subscribe('LeadReplied', onLeadReplied);
  
  globalForRegistry._eventsRegistered = true;
  console.log('[EventRegistry] Events successfully bootstrapped.');
}
