/**
 * In-memory implementation of the EventStorePort for testing
 */
import { Event, UUID } from '../../core/contracts';
import { EventStorePort } from '../../core/ports';
/**
 * In-memory implementation of the EventStorePort
 * Used for testing and development
 */
export declare class InMemoryEventStore implements EventStorePort {
    private events;
    private snapshots;
    /**
     * Generate a key for the store
     */
    private key;
    /**
     * Append events to the event store
     * @param tenantId Tenant ID
     * @param aggregateType Type of the aggregate
     * @param aggregateId ID of the aggregate
     * @param events Events to append
     * @param expectedVersion Expected version of the aggregate (for optimistic concurrency)
     */
    append(tenantId: UUID, aggregateType: string, aggregateId: UUID, events: Event[], expectedVersion: number): Promise<void>;
    /**
     * Load a snapshot for an aggregate
     * @param tenantId Tenant ID
     * @param aggregateType Type of the aggregate
     * @param aggregateId ID of the aggregate
     * @returns Snapshot version and state, or null if no snapshot exists
     */
    loadSnapshot(tenantId: UUID, aggregateType: string, aggregateId: UUID): Promise<{
        version: number;
        state: any;
        schemaVersion: number;
    } | null>;
    /**
     * Load events for an aggregate
     * Pure event loader that loads events from a specific version.
     * @param tenantId Tenant ID
     * @param aggregateType Type of the aggregate
     * @param aggregateId ID of the aggregate
     * @param fromVersion Version to start loading events from (default: 0)
     * @returns Events and version, or null if aggregate doesn't exist
     */
    load(tenantId: UUID, aggregateType: string, aggregateId: UUID, fromVersion?: number): Promise<{
        events: Event[];
        version: number;
    } | null>;
    /**
     * Clear all data (for testing)
     */
    clear(): void;
}
