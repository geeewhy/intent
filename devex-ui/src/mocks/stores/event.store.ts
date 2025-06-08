import { createStore } from './createStore';
import { makeEvent } from '../factories/event.factory';
import type { Event } from '@/data/types';

export const eventStore = createStore<Event>(1000);
eventStore.seed(() => makeEvent(), 200);

// Port createEventStream from mockEvents.ts
export function createEventStream(tenantId?: string) {
  return {
    subscribe: (callback: (event: Event) => void) => {
      const interval = setInterval(() => {
        const newEvent = makeEvent({ tenant_id: tenantId });
        eventStore.push(newEvent);
        callback(newEvent);
      }, 3000);

      return () => clearInterval(interval);
    }
  };
}