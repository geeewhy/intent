// core/shared/type-guards.ts
import { Command, Event } from '../contracts';

// Runtime type checks used across commands and events
export function isCommand(input: any): input is Command {
    return (
        input &&
        typeof input.id === 'string' &&
        typeof input.tenant_id === 'string' &&
        typeof input.type === 'string' &&
        input.payload !== undefined &&
        'payload' in input
    );
}

export function isEvent(input: any): input is Event {
    return (
        input &&
        typeof input.id === 'string' &&
        typeof input.aggregateId === 'string' &&
        typeof input.version === 'number' &&
        typeof input.type === 'string'
    );
}

export function isCommandType(input: any, type: string): boolean {
    return isCommand(input) && input.type === type;
}

export function assertDataPropsMatchMapKeys<T extends object>(data: T, map: any) {
    const missing = Object.keys(map).filter(k => !(k in data));
    if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    return true;
}

export type PgTypeToTs<T extends string> =
    T extends 'uuid' ? string :
        T extends 'text' ? string :
            T extends 'integer' ? number :
                T extends 'timestamp' ? Date | string :
                    T extends 'jsonb' ? object :
                        any;