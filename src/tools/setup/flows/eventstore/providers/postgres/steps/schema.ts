//src/tools/setup/flows/eventstore/providers/postgres/steps/schema.ts
/**
 * Apply database schema migrations
 */
import { FlowCtx } from '../../../../../shared/types';
import path from 'node:path';
import fs from 'fs/promises';
import { Umzug } from 'umzug';
import pg from 'pg';

/**
 * Apply database schema migrations
 * @param ctx Flow context
 */
export default async function step(ctx: FlowCtx): Promise<void> {
  ctx.logger.info('Applying database schema migrations');

  // Get connection pool from context
  const pool = ctx.vars.pool as pg.Pool;
  if (!pool) {
    throw new Error('Database connection pool not found in context');
  }

  // Get migrations directory
  const migrationsDir = path.join(ctx.artifactsDir, 'migrations');
  ctx.logger.info(`Using migrations from ${migrationsDir}`);

  // Initialize Umzug
  const umzug = new Umzug({
    migrations: {
      glob: path.join(migrationsDir, '*.sql'),
      resolve: ({ name, path }) => ({
        name,
        up: async () => {
          ctx.logger.info(`Applying migration: ${name}`);
          if (!path) {
            throw new Error(`Migration path is undefined for ${name}`);
          }
          const sql = await fs.readFile(path, { encoding: 'utf8' });
          return pool.query(sql);
        },
        down: async () => {
          ctx.logger.warn(`No down migration available for ${name}`);
        }
      })
    },
    storage: {
      async logMigration({ name }) {
        await pool.query(
          'INSERT INTO "infra".migrations_eventstream(name) VALUES($1) ON CONFLICT DO NOTHING',
          [name]
        );
      },
      async unlogMigration({ name }) {
        await pool.query('DELETE FROM "infra".migrations_eventstream WHERE name = $1', [name]);
      },
      async executed() {
        const { rows } = await pool.query('SELECT name FROM "infra".migrations_eventstream ORDER BY name');
        return rows.map(row => row.name);
      }
    },
    logger: {
      info: (message) => ctx.logger.info(`Uzmug Migrator: ${JSON.stringify(message)}`),
      warn: (message) => ctx.logger.warn(`Uzmug Migrator: ${JSON.stringify(message)}`),
      error: (message) => ctx.logger.error(`Uzmug Migrator: ${JSON.stringify(message)}`),
      debug: (message) => ctx.logger.debug(`Uzmug Migrator: ${JSON.stringify(message)}`)
    }
  });

  // Ensure migrations table exists
  try {
    await pool.query(`
    CREATE SCHEMA IF NOT EXISTS infra;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "infra"."migrations_eventstream" (
        name VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    ctx.logger.error(`Failed to create migrations table: ${(error as Error).message}`);
    throw error;
  }

  // Check pending migrations
  const pending = await umzug.pending();
  if (pending.length === 0) {
    ctx.logger.info('No pending migrations');
    return;
  }

  // Apply migrations
  ctx.logger.info(`Found ${pending.length} pending migrations`);
  try {
    const migrations = await umzug.up();
    ctx.logger.info(`Successfully applied ${migrations.length} migrations`);

    // List applied migrations
    for (const migration of migrations) {
      ctx.logger.info(`Applied: ${migration.name}`);
    }
  } catch (error) {
    ctx.logger.error(`Migration failed: ${(error as Error).message}`);
    throw error;
  }

  ctx.logger.raw('-----');
  ctx.logger.info(`⚠️ If this is your initial setup, please do not forget to run:️\n ↳ npm run projections:migrate\n to complete the setup with initial projection migrations.\n-----`);
}
