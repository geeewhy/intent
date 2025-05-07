// core/utils/saga.ts

import { Command, Event, UUID, SagaContext, Metadata } from '../contracts';
import { inheritMetadata } from './metadata';

/**
 * Helper to create a delayed command from a saga or process manager context.
 */
export async function buildDelayedCommand<T>(
    ctx: SagaContext,
    tenantId: UUID,
    type: string,
    payload: T,
    delayMs: number,
    input: Command<any> | Event<any>,
    metadata?: Partial<Metadata>
): Promise<{ cmd: Command<T>; ms: number }> {
    const inheritedMetadata = inheritMetadata(input, ctx, {
        timestamp: new Date(Date.now() + delayMs),
        source: (ctx as any).constructor?.name ?? 'unknown',
        ...metadata,
    });

    const cmd: Command<T> = {
        id: await ctx.nextId(),
        tenant_id: tenantId,
        type,
        payload,
        metadata: inheritedMetadata,
    };

    return { cmd, ms: delayMs };
}
