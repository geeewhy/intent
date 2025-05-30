//src/tools/setup/flows/eventstore/providers/postgres/steps/test.ts
/**
 * Test event store functionality
 */
import { FlowCtx } from '../../../../../shared/types';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test event store functionality
 * @param ctx Flow context
 */
export default async function step(ctx: FlowCtx): Promise<void> {
  ctx.logger.info('Testing event store functionality');

  // Get connection pool from context
  const pool = ctx.vars.pool as pg.Pool;
  if (!pool) {
    throw new Error('Database connection pool not found in context');
  }

  // Check if events table exists
  try {
    const tableResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'events'
        AND table_schema = 'infra'
    `);

    if (tableResult.rows.length === 0) {
      throw new Error('Events table not found in infra schema');
    }

    ctx.logger.info('Events table exists in infra schema');
  } catch (error) {
    ctx.logger.error(`Failed to check events table: ${(error as Error).message}`);
    throw error;
  }

  // Generate test event
  const eventId = uuidv4();
  const tenantId = uuidv4();
  const aggregateId = uuidv4();
  const aggregateType = 'TestAggregate';
  const eventType = 'TestEvent';
  const version = 1;
  const payload = { message: 'Hello, Event Store!', timestamp: new Date().toISOString() };
  const metadata = { source: 'setup-tool', environment: process.env.NODE_ENV || 'development' };

  // Write test event
  try {
    ctx.logger.info(`Writing test event for aggregate: ${aggregateId}`);

    await pool.query(
      `INSERT INTO "infra"."events"(id, tenant_id, type, payload, aggregate_id, aggregate_type, version, metadata)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
      [eventId, tenantId, eventType, payload, aggregateId, aggregateType, version, metadata]
    );

    ctx.logger.info(`Test event written: ${eventId}`);
  } catch (error) {
    ctx.logger.error(`Failed to write test event: ${(error as Error).message}`);
    throw error;
  }

  // Read test event
  try {
    ctx.logger.info(`Reading test event: ${eventId}`);

    const result = await pool.query(
      `SELECT * FROM "infra"."events" WHERE id = $1`,
      [eventId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Test event not found: ${eventId}`);
    }

    const event = result.rows[0];

    // Verify event data
    if (
      event.tenant_id !== tenantId ||
      event.type !== eventType ||
      event.aggregate_id !== aggregateId ||
      event.aggregate_type !== aggregateType ||
      event.version !== version ||
      !event.payload ||
      !event.metadata
    ) {
      throw new Error('Test event data mismatch');
    }

    ctx.logger.info(`Test event read successfully: ${JSON.stringify({
      id: event.id,
      tenant_id: event.tenant_id,
      type: event.type,
      aggregate_id: event.aggregate_id,
      aggregate_type: event.aggregate_type,
      version: event.version,
      created_at: event.created_at
    })}`);
  } catch (error) {
    ctx.logger.error(`Failed to read test event: ${(error as Error).message}`);
    throw error;
  }

  // Test aggregates functionality if available
  try {
    const tableResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'aggregates'
        AND table_schema = 'infra'
    `);

    if (tableResult.rows.length > 0) {
      ctx.logger.info('Testing aggregates functionality');

      // Create aggregate snapshot
      const snapshot = { count: 1, lastEvent: eventId };

      await pool.query(
        `INSERT INTO "infra"."aggregates"(tenant_id, id, type, snapshot, version, created_at)
         VALUES($1, $2, $3, $4, $5, $6)`,
        [tenantId, aggregateId, aggregateType, snapshot, version, new Date()]
      );

      // Read aggregate
      const result = await pool.query(
        `SELECT * FROM "infra"."aggregates" WHERE id = $1 AND tenant_id = $2`,
        [aggregateId, tenantId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Test aggregate not found for id: ${aggregateId}`);
      }

      ctx.logger.info('Aggregates functionality working correctly');
    } else {
      ctx.logger.info('Aggregates table not found, skipping aggregates test');
    }
  } catch (error) {
    ctx.logger.warn(`Aggregates test failed: ${(error as Error).message}`);
    // Don't fail the step if aggregates test fails
  }

  ctx.logger.info('Event store functionality test completed successfully');

  // Clean up test data
  ctx.logger.info('Cleaning up test data');
  try {
    // Delete the test aggregate if it exists
    await pool.query(
      `DELETE FROM "infra"."aggregates" WHERE id = $1 AND tenant_id = $2`,
      [aggregateId, tenantId]
    );

    // Delete the test event
    await pool.query(
      `DELETE FROM "infra"."events" WHERE id = $1`,
      [eventId]
    );

    ctx.logger.info('Test data cleaned up successfully');
  } catch (error) {
    ctx.logger.warn(`Failed to clean up test data: ${(error as Error).message}`);
    // Don't fail the step if cleanup fails
  }
}
