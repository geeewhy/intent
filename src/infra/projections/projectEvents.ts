//src/infra/projections/projectEvents.ts
import { Event } from '../../core/contracts';
import { loadAllProjections } from './loadProjections';
import { createPool } from './pg-pool';

// Create a database pool
const pool = createPool();

/**
 * Simple trace function for observability
 * @param span The span name
 * @param data Additional data to log
 * @param fn The function to trace
 * @returns The result of the function
 */
async function trace<T>(span: string, data: any, fn: () => Promise<T>): Promise<T> {
  console.log(`[TRACE] ${span} - START PROJECTION`, data);
  try {
    const result = await fn();
    console.log(`[TRACE] ${span} - END`);
    return result;
  } catch (error) {
    console.error(`[TRACE] ${span} - ERROR`, error);
    throw error;
  }
}

/**
 * Projects events to read models
 * @param events The events to project
 */
export async function projectEvents(events: Event[]): Promise<void> {
  const handlers = await loadAllProjections(pool);

  for (const event of events) {
    for (const handler of handlers) {
      if (!handler.supportsEvent(event)) continue;
      
      try {
        await trace(`projection.handle.${event.type}`, { event }, async () => {
          await handler.on(event);
        });
      } catch (err) {
        console.warn('Projection failed', { eventType: event.type, error: err });
        // Optionally: await recordProjectionFailure(event, err);
      }
    }
  }
}