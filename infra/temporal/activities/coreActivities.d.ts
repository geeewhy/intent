import type { Command, Event, UUID } from '../../../core/contracts';
import { CommandResult } from '../../contracts';
export declare function projectEvents(events: Event[]): Promise<void>;
export declare function routeEvent(event: Event): Promise<void>;
export declare function routeCommand(command: Command): Promise<CommandResult>;
/**
 * Dispatch a command by inserting it into the `commands` table
 * This will be picked up by the CommandPump to run via Temporal
 */
export declare function dispatchCommand(cmd: Command): Promise<void>;
/**
 * Generate a UUID
 * Used by workflows for creating new IDs
 */
export declare function generateUUID(): string;
/**
 * Load an aggregate from the event store
 * @param tenantId Tenant ID
 * @param aggregateType Type of the aggregate
 * @param aggregateId ID of the aggregate
 * @returns The aggregate instance or null if it doesn't exist
 */
export declare function loadAggregate(tenantId: UUID, aggregateType: string, aggregateId: UUID): Promise<any | null>;
/**
 * Get events for a command without applying them
 * @param cmd
 */
export declare function getEventsForCommand(cmd: Command): Promise<{
    events?: Event[];
    status: 'success' | 'fail';
    error?: Error;
}>;
/**
 * Apply a list of events to an aggregate
 * @param tenantId
 * @param aggregateType
 * @param aggregateId
 * @param events
 */
export declare function applyEvents(tenantId: UUID, aggregateType: string, aggregateId: UUID, events: Event[]): Promise<void>;
/**
 * Create a snapshot of the current aggregate state
 * @param tenantId Tenant ID
 * @param aggregateType Type of the aggregate
 * @param aggregateId ID of the aggregate
 */
export declare function snapshotAggregate(tenantId: UUID, aggregateType: string, aggregateId: UUID): Promise<void>;
