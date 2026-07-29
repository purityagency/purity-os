import { eventBus } from './NextJsEventBus';
import { onProjectProvisioned } from '@/modules/onboarding/handlers/OnProjectProvisioned';

const globalForRegistry = global as unknown as { _eventsRegistered?: boolean }

export function bootstrapEvents() {
  if (globalForRegistry._eventsRegistered) return;
  
  eventBus.subscribe('ProjectProvisioned', onProjectProvisioned);
  
  globalForRegistry._eventsRegistered = true;
  console.log('[EventRegistry] Events successfully bootstrapped.');
}
