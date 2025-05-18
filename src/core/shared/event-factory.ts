// core/shared/event-factory.ts
// Generates events with standard metadata across domains

import { Event, UUID } from '../contracts';

export function buildEvent<T>(
    tenantId: UUID,
    aggregateId: UUID,
    aggregateType: string,
    type: string,
    version: number,
    payload: T,
    metadata: Partial<Event['metadata']> = {}
): Event<T> {
    return {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        type,
        aggregateId,
        aggregateType,
        version,
        payload,
        metadata: {
            timestamp: new Date(),
            ...metadata,
        },
    };
}
