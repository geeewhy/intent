import { DatabasePool } from 'slonik';
import { Event } from '../../core/contracts';
import { loadAllProjections } from './loadProjections';
import { traceSpan } from '../observability/otel-trace-span';

/**
 * Projects events to read models
 * @param events  Event batch
 * @param pool    Slonik DatabasePool supplied by caller
 */
export async function projectEvents(
    events: Event[],
    pool: DatabasePool,         // ← correct type
): Promise<void> {
  const handlers = await loadAllProjections(pool);

  for (const event of events) {
    for (const h of handlers) {
      if (!h.supportsEvent(event)) continue;

      try {
        await traceSpan(`projection.handle.${event.type}`, { event }, () =>
            h.on(event),
        );
      } catch (err) {
        console.warn('Projection failed', { eventType: event.type, error: err });
      }
    }
  }
}
