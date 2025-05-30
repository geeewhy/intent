//src/infra/pg/pg-event-store.ts
/**
 * PostgreSQL adapter for the EventStorePort
 */

import {Pool, PoolClient} from 'pg';
import {Event, UUID} from '../../core/contracts';
import {EventStorePort} from '../../core/ports';
import {BaseAggregate, Snapshot} from '../../core/base/aggregate';
import {upcastEvent} from "../../core/shared/event-upcaster";

export const SNAPSHOT_EVERY = 2; // Number of events after which to take a snapshot

/**
 * PostgreSQL implementation of the EventStorePort
 */
export class PgEventStore implements EventStorePort {
    public pool: Pool;

    /**
     * Constructor
     */
    constructor(connectionConfig?: any) {
        this.pool = new Pool(connectionConfig || {
            host: process.env.LOCAL_DB_HOST || 'localhost',
            port: parseInt(process.env.LOCAL_DB_PORT || '5432'),
            user: process.env.LOCAL_DB_USER || 'postgres',
            password: process.env.LOCAL_DB_PASSWORD || 'postgres',
            database: process.env.LOCAL_DB_NAME || 'postgres',
        });
    }

    /**
     * DEPRECATED: Use append instead
     *
     * Create or update a snapshot for an aggregate
     * @param tenantId Tenant ID
     * @param aggregate Aggregate instance to snapshot
     */
    async snapshotAggregate(tenantId: UUID, aggregate: BaseAggregate<any>): Promise<void> {
        const snapshot = aggregate.toSnapshot();
        await this.pool.query(`
            INSERT INTO infra.aggregates (id, tenant_id, type, version, snapshot, created_at, schema_version)
            VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id, tenant_id) DO
            UPDATE
                SET version = EXCLUDED.version,
                snapshot = EXCLUDED.snapshot,
                updated_at = NOW(),
                schema_version = EXCLUDED.schema_version
        `, [
            snapshot.id,
            tenantId,
            snapshot.type,
            aggregate.version,
            JSON.stringify(snapshot.state),
            snapshot.createdAt,
            snapshot.schemaVersion,
        ]);
    }

    /**
     * Append events to the event store
     * @param tenantId Tenant ID
     * @param aggregateType Type of the aggregate
     * @param aggregateId ID of the aggregate
     * @param events Events to append
     * @param expectedVersion Expected version of the aggregate (for optimistic concurrency)
     * @param snapshot Optional snapshot to persist, atomic with events
     */
    async append(
        tenantId: UUID,
        aggregateType: string,
        aggregateId: UUID,
        events: Event[],
        expectedVersion: number,
        snapshot?: Snapshot<any>,
    ): Promise<void> {
        if (events.length === 0 && !snapshot) return;

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await this.setTenantContext(client, tenantId);

            // Lock current stream head
            const {rows} = await client.query(
                `SELECT version
                 FROM infra.events
                 WHERE tenant_id = $1
                   AND aggregate_id = $2
                 ORDER BY version DESC LIMIT 1
         FOR
                UPDATE`,
                [tenantId, aggregateId],
            );
            const dbVersion = rows[0]?.version ?? 0;
            if (dbVersion !== expectedVersion) {
                throw new Error(
                    `Concurrency error: expected version ${expectedVersion}, got ${dbVersion}`,
                );
            }

            // Insert events
            let numberEvents = 0;
            for (numberEvents = 0; numberEvents < events.length; numberEvents++) {
                const evt = events[numberEvents];
                const version = expectedVersion + numberEvents + 1;

                await client.query(
                    `INSERT INTO infra.events (tenant_id, id, aggregate_id, aggregate_type,
                                               type, payload, version, metadata, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        tenantId,
                        evt.id,
                        aggregateId,
                        aggregateType,
                        evt.type,
                        JSON.stringify(evt.payload),
                        version,
                        JSON.stringify(evt.metadata ?? {}),
                        evt.metadata?.timestamp ?? new Date(),
                    ],
                );
            }

            // Persist snapshot (if provided) atomically
            const crossedSnapshotThreshold =
                snapshot &&
                Math.floor((expectedVersion + numberEvents) / SNAPSHOT_EVERY) >
                Math.floor(expectedVersion / SNAPSHOT_EVERY);

            if (crossedSnapshotThreshold) {
                await client.query(
                    `INSERT INTO infra.aggregates (id, tenant_id, type, version, snapshot, schema_version, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id, tenant_id)
         DO
                    UPDATE
                        SET version = EXCLUDED.version,
                        snapshot = EXCLUDED.snapshot,
                        schema_version = EXCLUDED.schema_version,
                        created_at = EXCLUDED.created_at
                    WHERE infra.aggregates.version < EXCLUDED.version`,
                    [
                        aggregateId,
                        tenantId,
                        aggregateType,
                        snapshot.version,
                        JSON.stringify(snapshot.state),
                        snapshot.schemaVersion,
                        snapshot.createdAt,
                    ],
                );
            }

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('Error appending events:', e);
            throw e;
        } finally {
            client.release();
        }
    }

    /**
     * Load a snapshot for an aggregate
     * @param tenantId Tenant ID
     * @param aggregateType Type of the aggregate
     * @param aggregateId ID of the aggregate
     * @returns Snapshot version and state, or null if no snapshot exists
     */
    async loadSnapshot(tenantId: UUID, aggregateType: string, aggregateId: UUID): Promise<{
        version: number;
        state: any;
        schemaVersion: number
    } | null> {
        const client = await this.pool.connect();
        try {
            // Set tenant context for RLS
            await this.setTenantContext(client, tenantId);

            // Check if a snapshot exists
            const snapshotResult = await client.query(`
                SELECT version, snapshot, schema_version
                FROM infra.aggregates
                WHERE tenant_id = $1
                  AND id = $2
                  AND type = $3
            `, [tenantId, aggregateId, aggregateType]);

            if (snapshotResult && snapshotResult.rowCount && snapshotResult.rowCount > 0) {
                const snapshotRow = snapshotResult.rows[0];
                return {
                    version: snapshotRow.version,
                    state: snapshotRow.snapshot,
                    schemaVersion: snapshotRow.schema_version ?? 1
                };
            }

            return null;
        } catch (error) {
            console.error('Error loading snapshot:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Load events for an aggregate
     * Pure event loader that loads events from a specific version.
     * @param tenantId Tenant ID
     * @param aggregateType Type of the aggregate
     * @param aggregateId ID of the aggregate
     * @param fromVersion Version to start loading events from (default: 0)
     * @returns Events and version, or null if aggregate doesn't exist
     */
    async load(tenantId: UUID, aggregateType: string, aggregateId: UUID, fromVersion = 0): Promise<{
        events: Event[];
        version: number
    } | null> {
        const client = await this.pool.connect();
        try {
            // Set tenant context for RLS
            await this.setTenantContext(client, tenantId);

            // Query events from the specified version
            const eventsQuery = `
                SELECT *
                FROM infra.events
                WHERE tenant_id = $1
                  AND aggregate_id = $2
                  AND aggregate_type = $3
                  AND version > $4
                ORDER BY version ASC
            `;

            const eventsParams = [tenantId, aggregateId, aggregateType, fromVersion];

            const eventsResult = await client.query(eventsQuery, eventsParams);

            // If no events and fromVersion is 0, return null (aggregate doesn't exist)
            if (eventsResult.rowCount === 0 && fromVersion === 0) {
                return null;
            }

            // Convert rows to Event objects
            const events = eventsResult.rows.map(row => {
                const schemaVersion = row.metadata.schemaVersion || 1;

                return {
                    id: row.id,
                    tenant_id: row.tenant_id,
                    type: row.type,
                    aggregateType: row.aggregate_type,
                    aggregateId: row.aggregate_id,
                    version: row.version,
                    payload: upcastEvent(row.type, row.payload, schemaVersion),
                    metadata: row.metadata,
                }
            });

            // Calculate the current version (max of fromVersion and highest event version)
            const maxEventVersion = events.length > 0
                ? Math.max(...events.map(e => e.version))
                : 0;
            const version = Math.max(fromVersion, maxEventVersion);

            return {events, version};
        } catch (error) {
            console.error('Error loading events:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Set the tenant context for Row-Level Security
     */
    private async setTenantContext(client: PoolClient, tenantId: UUID): Promise<void> {
        //todo add RLS to schema & test
        //await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
    }

    /**
     * Close the database connection pool
     */
    async close(): Promise<void> {
        await this.pool.end();
    }
}
