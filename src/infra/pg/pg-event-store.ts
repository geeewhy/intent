/**
 * PostgreSQL adapter for the EventStorePort
 */

import { Pool, PoolClient } from 'pg';
import { Event, UUID } from '../../core/contracts';
import { EventStorePort } from '../../core/ports';

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
   * Initialize the database schema
   */
  async initSchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create events table
      await client.query(`
        CREATE TABLE IF NOT EXISTS events (
          tenant_id UUID NOT NULL,
          id UUID PRIMARY KEY,
          aggregate_id UUID NOT NULL,
          aggregate_type TEXT NOT NULL,
          type TEXT NOT NULL,
          payload JSONB NOT NULL,
          version INT NOT NULL,
          metadata JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Create index for efficient querying by tenant and aggregate
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_events_tenant_aggregate 
        ON events (tenant_id, aggregate_type, aggregate_id, version);
      `);

      // Create aggregates table for snapshots (optional optimization)
      await client.query(`
        CREATE TABLE IF NOT EXISTS aggregates (
          tenant_id UUID NOT NULL,
          id UUID NOT NULL,
          type TEXT NOT NULL,
          snapshot JSONB NOT NULL,
          version INT NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          PRIMARY KEY (tenant_id, id)
        );
      `);

      // Create commands table for tracking command status
      await client.query(`
        CREATE TABLE IF NOT EXISTS commands (
          tenant_id UUID NOT NULL,
          id UUID PRIMARY KEY,
          type TEXT NOT NULL,
          payload JSONB NOT NULL,
          metadata JSONB NOT NULL,
          status TEXT NOT NULL,
          error TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Create index for commands by tenant
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_commands_tenant 
        ON commands (tenant_id);
      `);

      // Set up Row-Level Security for multi-tenancy
      await client.query(`
        ALTER TABLE events ENABLE ROW LEVEL SECURITY;
        ALTER TABLE aggregates ENABLE ROW LEVEL SECURITY;
        ALTER TABLE commands ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS events_tenant_isolation ON events;
        CREATE POLICY events_tenant_isolation ON events
          USING (tenant_id = current_setting('app.tenant_id')::UUID);

        DROP POLICY IF EXISTS aggregates_tenant_isolation ON aggregates;
        CREATE POLICY aggregates_tenant_isolation ON aggregates
          USING (tenant_id = current_setting('app.tenant_id')::UUID);

        DROP POLICY IF EXISTS commands_tenant_isolation ON commands;
        CREATE POLICY commands_tenant_isolation ON commands
          USING (tenant_id = current_setting('app.tenant_id')::UUID);
      `);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error initializing database schema:', error);
      throw error;
    } finally {
      client.release();
    }
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

      // Get current version without using FOR UPDATE with aggregate functions
      // Option 1: First query to get the MAX version
      const { rows } = await client.query(`
      SELECT MAX(version) AS version
      FROM events
      WHERE tenant_id = $1 AND aggregate_id = $2
    `, [tenantId, aggregateId]);

      const currentVersion = rows[0].version ? Number(rows[0].version) : 0;

      if (currentVersion !== expectedVersion) {
        throw new Error(`VersionConflictError: expected ${expectedVersion}, found ${currentVersion}`);
      }

      // Option 2: Lock the specific aggregate using a separate query
      // This ensures no other transaction can modify these events while we're working
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

      // Rest of the function remains the same...
      // Create or update snapshot if needed...

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
  async load(tenantId: UUID, aggregateType: string, aggregateId: UUID): Promise<{ events: Event[]; version: number } | null> {
    const client = await this.pool.connect();
    try {
      // Set tenant context for RLS
      await this.setTenantContext(client, tenantId);

      // Check if a snapshot exists
      const snapshotResult = await client.query(`
        SELECT version FROM aggregates
        WHERE tenant_id = $1 AND id = $2 AND type = $3
      `, [tenantId, aggregateId, aggregateType]);

      let fromVersion = 0;
      if (snapshotResult && snapshotResult.rowCount && snapshotResult.rowCount > 0) {
        fromVersion = snapshotResult.rows[0].version;
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

      return { events, version };
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
