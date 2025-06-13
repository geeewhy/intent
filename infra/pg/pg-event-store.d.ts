/**
 * PostgreSQL adapter for the EventStorePort
 */
import { Pool } from 'pg';
import { Event, UUID } from '../../core/contracts';
import { EventStorePort } from '../../core/ports';
import { BaseAggregate, Snapshot } from '../../core/base/aggregate';
export declare const SNAPSHOT_EVERY = 2;
/**
 * PostgreSQL implementation of the EventStorePort
 */
export declare class PgEventStore implements EventStorePort {
    pool: Pool;
    /**
     * Constructor
     */
    constructor(connectionConfig?: any);
    /**
     * DEPRECATED: Use append instead
     *
     * Create or update a snapshot for an aggregate
     * @param tenantId Tenant ID
     * @param aggregate Aggregate instance to snapshot
     */
    snapshotAggregate(tenantId: UUID, aggregate: BaseAggregate<any>): Promise<void>;
    /**
     * Append events to the event store
     * @param tenantId Tenant ID
     * @param aggregateType Type of the aggregate
     * @param aggregateId ID of the aggregate
     * @param events Events to append
     * @param expectedVersion Expected version of the aggregate (for optimistic concurrency)
     * @param snapshot Optional snapshot to persist, atomic with events
     */
    append(tenantId: UUID, aggregateType: string, aggregateId: UUID, events: Event[], expectedVersion: number, snapshot?: Snapshot<any>): Promise<void>;
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
     * Set the tenant context for Row-Level Security
     */
    private setTenantContext;
    /**
     * Close the database connection pool
     */
    close(): Promise<void>;
}
