import { Event, UUID } from '../contracts';
export declare function buildEvent<T>(tenantId: UUID, aggregateId: UUID, aggregateType: string, type: string, version: number, payload: T, metadata?: Partial<Event['metadata']>): Event<T>;
