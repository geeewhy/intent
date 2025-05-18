// core/shared/command-factory.ts
// Cross-domain utility to build commands with consistent metadata

import { Command, UUID } from '../contracts';

export function buildCommand<T>(
    id: string,
    tenantId: UUID,
    type: string,
    payload: T,
    metadata: Partial<Command['metadata']> = {},
): Command<T> {
    return {
        id,
        tenant_id: tenantId,
        type,
        payload,
        metadata: {
            timestamp: new Date(),
            ...metadata,
        },
    };
}

export function cloneMetadataFrom(
    source: { metadata?: Command['metadata'] },
    overrides?: Partial<Command['metadata']>,
): Command['metadata'] {
    return {
        userId: source.metadata?.userId,
        correlationId: source.metadata?.correlationId,
        causationId: source.metadata?.causationId,
        requestId: source.metadata?.requestId,
        source: source.metadata?.source,
        timestamp: new Date(),
        ...overrides,
    };
}
