import { createStore } from './createStore';
import { makeEvent } from '../factories/event.factory';
import type { Event } from '@/data/types';

export const eventStore = createStore<Event>(1000);
eventStore.seed(() => makeEvent(), 200);

// Port createEventStream from mockEvents.ts
export function createEventStream(tenantId?: string) {
  let cancelled = false;

  const emitRandomly = (callback: (event: Event) => void) => {
    const delay = 500 + Math.random() * 1500;
    setTimeout(() => {
      if (cancelled) return;

      const newEvent = makeEvent({ tenant_id: tenantId });
      eventStore.push(newEvent);
      callback(newEvent);

      emitRandomly(callback); // schedule next
    }, delay);
  };

  return {
    subscribe: (callback: (event: Event) => void) => {
      emitRandomly(callback);
      return () => {
        cancelled = true;
      };
    }
  };
}
