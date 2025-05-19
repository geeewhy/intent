#!/usr/bin/env ts-node
//src/tools/repair-projection-drift.ts
/**
 * Projection Drift Repair Tool 
 * 
 * Usage: 
 *   npm run repair:projection-drift -- --table <table_name> [--table <another_table>]
 *   npm run repair:projection-drift -- --domain <domain_name>
 *   npm run repair:projection-drift -- --all
 *   npm run repair:projection-drift -- --from-drift-report <file_path>
 * 
 * Options:
 *   --table <table_name>       Repair specific table(s)
 *   --domain <domain_name>     Repair all tables in a specific domain
 *   --all                      Repair all tables (use with caution)
 *   --from-drift-report <path> Read tables to repair from a drift report file
 *   --help                     Show this help message
 */

import { createPool } from '../infra/projections/pg-pool';
import { generateRlsPolicies } from '../infra/projections/genRlsSql';
import { runAllMigrations } from '../infra/migrations/runMigrations';
import { sql as sqlTag, DatabasePool } from 'slonik';
import { Pool } from 'pg';
import * as path from 'path';
import * as fs from 'fs';
import { globSync } from 'glob';
import * as dotenv from 'dotenv';
dotenv.config();

// Command line arguments interface
interface CommandLineArgs {
  tables: string[];
  domain?: string;
  all: boolean;
  fromDriftReport?: string;
  help: boolean;
}

// Parse command line arguments
function parseArgs(): CommandLineArgs {
  const args: CommandLineArgs = {
    tables: [],
    all: false,
    help: false
  };

  // Skip the first two arguments (node and script path)
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg === '--help') {
      args.help = true;
    } else if (arg === '--all') {
      args.all = true;
    } else if (arg === '--table' && i + 1 < process.argv.length) {
      args.tables.push(process.argv[++i]);
    } else if (arg === '--domain' && i + 1 < process.argv.length) {
      args.domain = process.argv[++i];
    } else if (arg === '--from-drift-report' && i + 1 < process.argv.length) {
      args.fromDriftReport = process.argv[++i];
    }
  }

  return args;
}

// Display help message
function showHelp() {
  console.log(`
Projection Drift Repair Tool

Usage: 
  npm run repair:projection-drift -- --table <table_name> [--table <another_table>]
  npm run repair:projection-drift -- --domain <domain_name>
  npm run repair:projection-drift -- --all
  npm run repair:projection-drift -- --from-drift-report <file_path>

Options:
  --table <table_name>       Repair specific table(s)
  --domain <domain_name>     Repair all tables in a specific domain
  --all                      Repair all tables (use with caution)
  --from-drift-report <path> Read tables to repair from a drift report file
  --help                     Show this help message
`);
}

// Read tables from drift report file
function readTablesFromDriftReport(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const tables: string[] = [];

    // Extract table names from drift report
    // Format expected: [DRIFT] Projection 'name' (table 'table_name'):
    const regex = /\[DRIFT\] Projection '[^']*' \(table '([^']*)'\):/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match[1]) {
        tables.push(match[1]);
      }
    }

    return tables;
  } catch (error: any) {
    console.error(`Error reading drift report file: ${error.message || error}`);
    process.exit(1);
    return []; // This line is unreachable but needed for TypeScript
  }
}

interface ProjectionMeta {
  table: string;
  columnTypes: Record<string, string>;
  eventTypes: string[];
}

// Utility: Load all projectionMeta and their corresponding register function
function discoverProjectionRegistries() {
  const results: {
    meta: ProjectionMeta;
    registerHandlers: (pool: any) => any[];
    registerFile: string;
  }[] = [];

  // Find all register files under read-models
  const registerFiles = globSync('src/core/**/read-models/register.ts', { absolute: true });

  for (const file of registerFiles) {
    delete require.cache[require.resolve(file)];
    const mod = require(file);

    // Look for exported meta and handler registration
    // Support multi-table exports if projectionMeta is an array
    if (mod.projectionMeta) {
      const metas = Array.isArray(mod.projectionMeta) ? mod.projectionMeta : [mod.projectionMeta];
      for (const meta of metas) {
        // Find handler registration function in the same file (must start with "register" and be a function)
        const handlerFuncKey = Object.keys(mod).find(
          k => k.startsWith('register') && typeof mod[k] === 'function'
        );
        if (handlerFuncKey) {
          results.push({
            meta,
            registerHandlers: mod[handlerFuncKey],
            registerFile: file,
          });
        }
      }
    }
  }
  return results;
}

// Fetch events for a set of event types
async function fetchEvents(pool: DatabasePool, eventTypes: string[]): Promise<readonly any[]> {
  // Create a pg Pool instance for querying events
  const pgPool = new Pool({
    host: process.env.LOCAL_DB_HOST || 'localhost',
    port: parseInt(process.env.LOCAL_DB_PORT || '5432'),
    user: process.env.LOCAL_DB_USER || 'postgres',
    password: process.env.LOCAL_DB_PASSWORD || 'postgres',
    database: process.env.LOCAL_DB_NAME || 'postgres',
  });

  try {
    // Check if the events table exists
    const tableExistsResult = await pgPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'events'
      )
    `);

    const tableExists = tableExistsResult.rows[0].exists;

    if (!tableExists) {
      console.log(`[REPAIR] Events table does not exist, skipping event replay`);
      return [];
    }

    const result = await pgPool.query(`
      SELECT *, aggregate_id as "aggregateId" FROM events
      WHERE type = ANY($1)
      ORDER BY created_at ASC
    `, [eventTypes]);

    return result.rows;
  } catch (error: any) {
    console.warn(`[REPAIR] Error fetching events: ${error.message || error}`);
    return [];
  } finally {
    await pgPool.end();
  }
}

async function repairProjection({
  table,
  eventTypes,
  registerHandlers,
}: {
  table: string;
  eventTypes: string[];
  registerHandlers: (pool: any) => any[];
}) {
  const pool = createPool();
  console.log(`\n[REPAIR] Dropping and recreating table: ${table}`);
  await pool.query(sqlTag`DROP TABLE IF EXISTS ${sqlTag.identifier([table])} CASCADE`);

  // Run migrations manually to avoid RLS policy application
  console.log(`[REPAIR] Running migrations...`);

  // Create a pg Pool instance for running migrations and handling policy queries
  const pgPool = new Pool({
    host: process.env.LOCAL_DB_HOST || 'localhost',
    port: parseInt(process.env.LOCAL_DB_PORT || '5432'),
    user: process.env.LOCAL_DB_USER || 'postgres',
    password: process.env.LOCAL_DB_PASSWORD || 'postgres',
    database: process.env.LOCAL_DB_NAME || 'postgres',
  });

  try {
    // Find and run migrations for this table
    const migrationDirs = globSync('src/core/**/read-models/migrations');
    for (const dir of migrationDirs) {
      const migrationFiles = globSync(`${dir}/*.sql`);
      for (const migrationFile of migrationFiles) {
        // Only run migrations that might affect this table
        if (migrationFile.toLowerCase().includes(table.toLowerCase())) {
          console.log(`[REPAIR] Running migration: ${migrationFile}`);
          const sqlContent = fs.readFileSync(migrationFile, 'utf8');
          await pgPool.query(sqlContent);
        }
      }
    }

    // Query all events for this projection
    const events = await fetchEvents(pool, eventTypes);

    // Register relevant handlers for this projection
    const handlers = registerHandlers(pool);

    // Replay events
    if (events.length && handlers.length) {
      console.log(`[REPAIR] Replaying ${events.length} events for '${table}'...`);

      // Custom projection function that only projects events to specific handlers
      for (const event of events) {
        for (const handler of handlers) {
          if (!handler.supportsEvent(event)) continue;

          try {
            console.log(`[REPAIR] Projecting event ${event.type} for table ${table}`);
            await handler.handle(event);
          } catch (err) {
            console.warn('Projection failed', { eventType: event.type, error: err });
          }
        }
      }
    } else {
      console.log(`[REPAIR] No events or handlers found for '${table}'.`);
    }

    // Rerun RLS for this table
    console.log(`[REPAIR] Reapplying RLS policies...`);
    const rlsPolicies = await generateRlsPolicies();

    // Check if the table exists before applying RLS policies
    const tableExistsResult = await pgPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      )
    `, [table]);

    const tableExists = tableExistsResult.rows[0].exists;

    if (!tableExists) {
      console.log(`[REPAIR] Table '${table}' does not exist, skipping RLS policies`);
      return;
    }

    for (const policy of rlsPolicies.filter(p => p.tableName === table)) {
      await pgPool.query(policy.enableRlsQuery);
      await pgPool.query(policy.dropPolicyQuery);
      await pgPool.query(policy.createPolicyQuery);
      if (policy.commentPolicyQuery) {
        await pgPool.query(policy.commentPolicyQuery);
      }
    }
  } finally {
    await pgPool.end();
    await pool.end();
  }

  console.log(`[REPAIR] Repair for table '${table}' complete.`);
}

async function main() {
  // Parse command line arguments
  const args = parseArgs();

  // Show help and exit if --help is provided
  if (args.help) {
    showHelp();
    return;
  }

  // Get all available projections
  const registries = discoverProjectionRegistries();
  if (!registries.length) {
    console.log('No projections found.');
    return;
  }

  // Filter projections based on command line arguments
  let projectionsToBuild: Array<{
    meta: ProjectionMeta;
    registerHandlers: (pool: any) => any[];
  }> = [];

  // Process --from-drift-report
  if (args.fromDriftReport) {
    const tablesToRepair = readTablesFromDriftReport(args.fromDriftReport);
    console.log(`Found ${tablesToRepair.length} tables to repair from drift report: ${tablesToRepair.join(', ')}`);

    projectionsToBuild = registries.filter(({ meta }) => 
      tablesToRepair.includes(meta.table)
    );
  }
  // Process --table
  else if (args.tables.length > 0) {
    console.log(`Repairing specific tables: ${args.tables.join(', ')}`);

    projectionsToBuild = registries.filter(({ meta }) => 
      args.tables.includes(meta.table)
    );
  }
  // Process --domain
  else if (args.domain) {
    console.log(`Repairing all tables in domain: ${args.domain}`);

    // Extract domain from register file path (e.g., src/core/system/read-models/register.ts -> system)
    projectionsToBuild = registries.filter(({ registerFile }) => {
      const domainMatch = registerFile.match(/src\/core\/([^/]+)/);
      return domainMatch && domainMatch[1] === args.domain;
    });
  }
  // Process --all
  else if (args.all) {
    console.log('Repairing ALL tables. This may take a while...');
    projectionsToBuild = registries;
  }
  // No valid filter provided
  else {
    console.error('Error: You must specify at least one of: --table, --domain, --all, or --from-drift-report');
    showHelp();
    process.exit(1);
  }

  // Check if we found any projections to build
  if (projectionsToBuild.length === 0) {
    console.error('No matching projections found for the specified filters.');
    process.exit(1);
  }

  console.log(`Found ${projectionsToBuild.length} projections to repair.`);

  // Process each projection
  for (const { meta, registerHandlers } of projectionsToBuild) {
    await repairProjection({
      table: meta.table,
      eventTypes: meta.eventTypes,
      registerHandlers,
    });
  }

  console.log('\n✅ Projection drift repair finished.');
}

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}
