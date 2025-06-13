import { Command, Event, UUID, SagaContext, Metadata } from '../contracts';
/**
 * Helper to create a delayed command from a saga or process manager context.
 */
export declare function buildDelayedCommand<T>(ctx: SagaContext, tenantId: UUID, type: string, payload: T, delayMs: number, input: Command<any> | Event<any>, metadata?: Partial<Metadata>): Promise<{
    cmd: Command<T>;
    ms: number;
}>;
