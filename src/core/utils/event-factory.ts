//core/utils/event-factory.ts

import { Event, UUID } from '../contracts';

export function buildEvent<T>(
    tenantId: UUID,
    aggregateId: UUID,
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
        version,
        payload,
        metadata: {
            timestamp: new Date(),
            ...metadata,
        },
    };
}
