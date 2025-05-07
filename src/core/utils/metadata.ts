//core/utils/metadata.ts
import { Command, Event, Metadata  } from '../contracts';

export function inheritMetadata(
    input: Command | Event,
    ctx: { getHint?<T>(key: string): T | undefined },
    extendMetadata?: Partial<Metadata>
): Metadata {
    return {
        userId: input.metadata?.userId,
        timestamp: new Date(),
        correlationId: input.metadata?.correlationId,
        causationId: input.id,
        requestId: ctx.getHint?.('requestId'),
        source: extendMetadata?.source ?? 'unknown',
        ...extendMetadata,
    };
}