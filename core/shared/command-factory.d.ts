import { Command, UUID } from '../contracts';
export declare function buildCommand<T>(id: string, tenantId: UUID, type: string, payload: T, metadata?: Partial<Command['metadata']>): Command<T>;
export declare function cloneMetadataFrom(source: {
    metadata?: Command['metadata'];
}, overrides?: Partial<Command['metadata']>): Command['metadata'];
