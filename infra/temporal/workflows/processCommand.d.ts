import type { Event, UUID } from '../../../core/contracts';
type CommandResult = {
    status: 'success' | 'fail';
    events?: Event[];
    error?: Error;
};
export declare function processCommand(tenantId: UUID, aggregateType: string, aggregateId: UUID): Promise<CommandResult>;
export {};
