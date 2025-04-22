/**
 * PostgreSQL adapter for the EventStorePort
 */

import { Pool, PoolClient } from 'pg';
import { Event, UUID } from '../../domain/contracts';
import { EventStorePort } from '../../domain/ports';

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
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || 'kitcheneats',
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
        ON events (tenant_id, aggregate_id, version);
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
   */
  async append(events: Event[]): Promise<void> {
    if (events.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Set tenant context for RLS
      await this.setTenantContext(client, events[0].tenant_id);

      // Insert events
      for (const event of events) {
        await client.query(`
          INSERT INTO events (
            tenant_id, id, aggregate_id, type, payload, version, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          event.tenant_id,
          event.id,
          event.aggregateId,
          event.type,
          JSON.stringify(event.payload),
          event.version,
          JSON.stringify(event.metadata || {}),
          event.metadata?.timestamp || new Date()
        ]);

        // Notify subscribers about the new event
        await client.query(`
          NOTIFY events_${event.tenant_id}, '${JSON.stringify(event)}'
        `);
      }

      // Update aggregate snapshot (optional optimization)
      const lastEvent = events[events.length - 1];
      await client.query(`
        INSERT INTO aggregates (tenant_id, id, type, snapshot, version, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (tenant_id, id) DO UPDATE
        SET snapshot = $4, version = $5, updated_at = $6
      `, [
        lastEvent.tenant_id,
        lastEvent.aggregateId,
        lastEvent.type.split('.')[0], // Extract aggregate type from event type
        JSON.stringify({ 
          id: lastEvent.aggregateId,
          version: lastEvent.version,
          // Add other aggregate state here if needed
        }),
        lastEvent.version,
        new Date()
      ]);

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
   */
  async load(tenant: UUID, aggregateId: UUID): Promise<Event[]> {
    const client = await this.pool.connect();
    try {
      // Set tenant context for RLS
      await this.setTenantContext(client, tenant);

      // Query events
      const result = await client.query(`
        SELECT * FROM events
        WHERE tenant_id = $1 AND aggregate_id = $2
        ORDER BY version ASC
      `, [tenant, aggregateId]);

      // Convert rows to Event objects
      return result.rows.map(row => ({
        id: row.id,
        tenant_id: row.tenant_id,
        type: row.type,
        aggregateId: row.aggregate_id,
        version: row.version,
        payload: row.payload,
        metadata: row.metadata,
      }));
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
