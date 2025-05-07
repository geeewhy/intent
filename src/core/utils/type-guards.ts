//core/utils/type-guards.ts

import { Command, Event } from '../contracts';

export function isCommand(input: any): input is Command {
    return (
        input &&
        typeof input.id === 'string' &&
        typeof input.tenant_id === 'string' &&
        typeof input.type === 'string' &&
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