//src/infra/pg/pg-event-store.ts
/**
 * PostgreSQL adapter for the EventStorePort
 */

import { Pool, PoolClient } from 'pg';
import { Event, UUID } from '../../core/contracts';
import { EventStorePort } from '../../core/ports';
import { BaseAggregate } from '../../core/base/aggregate';
import { getAggregateClass } from '../../core/aggregates';

/**
 * PostgreSQL implementation of the EventStorePort
 */
export class PgEventStore implements EventStorePort {
  private pool: Pool;

  /**
   * Constructor
   */
  constructor(connectionConfig?: any) {
    this.pool = new Pool(connectionConfig || {
      host: process.env.SUPABASE_DB_HOST || 'localhost',
      port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
      user: process.env.SUPABASE_DB_USER || 'postgres',
      password: process.env.SUPABASE_DB_PASSWORD || 'postgres',
      database: process.env.SUPABASE_DB_NAME || 'postgres',
    });
  }

  /**
   * Create or update a snapshot for an aggregate
   * @param tenantId Tenant ID
   * @param aggregate Aggregate instance to snapshot
   */
  async snapshotAggregate(tenantId: UUID, aggregate: BaseAggregate<any>): Promise<void> {
    const snapshot = aggregate.toSnapshot();
    await this.pool.query(`
      INSERT INTO aggregates (id, tenant_id, type, version, snapshot, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id, tenant_id) DO UPDATE
      SET version = EXCLUDED.version,
          snapshot = EXCLUDED.snapshot,
          created_at = EXCLUDED.created_at
    `, [
      snapshot.id,
      tenantId,
      snapshot.type,
      aggregate.version,
      JSON.stringify(snapshot.state),
      snapshot.createdAt,
    ]);
  }

  /**
   * Append events to the event store
   * @param tenantId Tenant ID
   * @param aggregateType Type of the aggregate
   * @param aggregateId ID of the aggregate
   * @param events Events to append
   * @param expectedVersion Expected version of the aggregate (for optimistic concurrency)
   */
  async append(tenantId: UUID, aggregateType: string, aggregateId: UUID, events: Event[], expectedVersion: number): Promise<void> {
    if (events.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Set tenant context for RLS
      await this.setTenantContext(client, tenantId);

      await client.query(`
      SELECT 1 FROM events 
      WHERE tenant_id = $1 AND aggregate_id = $2
      FOR UPDATE
    `, [tenantId, aggregateId]);

      // Insert events
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const version = expectedVersion + i + 1;

        await client.query(`
        INSERT INTO events (
          tenant_id, id, aggregate_id, aggregate_type, type, payload, version, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
          tenantId,
          event.id,
          aggregateId,
          aggregateType,
          event.type,
          JSON.stringify(event.payload),
          version,
          JSON.stringify(event.metadata || {}),
          event.metadata?.timestamp || new Date()
        ]);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error appending events:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Load events for an aggregate
   * First checks if a snapshot exists. If so, loads snapshot + replays only newer events.
   * Otherwise, replays from event 0.
   * @param tenantId Tenant ID
   * @param aggregateType Type of the aggregate
   * @param aggregateId ID of the aggregate
   * @returns Events and version, or null if aggregate doesn't exist
   */
  async load(tenantId: UUID, aggregateType: string, aggregateId: UUID): Promise<{ events: Event[]; version: number; aggregate?: any } | null> {
    const client = await this.pool.connect();
    try {
      // Set tenant context for RLS
      await this.setTenantContext(client, tenantId);

      // Check if a snapshot exists
      const snapshotResult = await client.query(`
        SELECT version, snapshot FROM aggregates
        WHERE tenant_id = $1 AND id = $2 AND type = $3
      `, [tenantId, aggregateId, aggregateType]);

      let fromVersion = 0;
      let aggregate = null;

      if (snapshotResult && snapshotResult.rowCount && snapshotResult.rowCount > 0) {
        const snapshotRow = snapshotResult.rows[0];
        fromVersion = snapshotRow.version;

        // Deserialize the snapshot
        const AggregateClass = getAggregateClass(aggregateType);
        if (AggregateClass) {
          const instance = new AggregateClass(aggregateId);
          instance.applySnapshotState(snapshotRow.snapshot);
          instance.version = snapshotRow.version;
          aggregate = instance;
        }
      }

      // Query events (all or just those after the snapshot)
      const eventsQuery = fromVersion > 0
        ? `
          SELECT * FROM events
          WHERE tenant_id = $1 AND aggregate_id = $2 AND aggregate_type = $3 AND version > $4
          ORDER BY version ASC
        `
        : `
          SELECT * FROM events
          WHERE tenant_id = $1 AND aggregate_id = $2 AND aggregate_type = $3
          ORDER BY version ASC
        `;

      const eventsParams = fromVersion > 0
        ? [tenantId, aggregateId, aggregateType, fromVersion]
        : [tenantId, aggregateId, aggregateType];

      const eventsResult = await client.query(eventsQuery, eventsParams);

      // If no events and no snapshot, return null
      if (eventsResult.rowCount === 0 && fromVersion === 0) {
        return null;
      }

      // Convert rows to Event objects
      const events = eventsResult.rows.map(row => ({
        id: row.id,
        tenant_id: row.tenant_id,
        type: row.type,
        aggregateId: row.aggregate_id,
        version: row.version,
        payload: row.payload,
        metadata: row.metadata,
      }));

      // Calculate the current version (max of snapshot version and highest event version)
      const maxEventVersion = events.length > 0
        ? Math.max(...events.map(e => e.version))
        : 0;
      const version = Math.max(fromVersion, maxEventVersion);

      return { events, version, aggregate };
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
    await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
  }

  /**
   * Close the database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
