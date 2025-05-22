#!/usr/bin/env ts-node

import { createPool } from '../infra/projections/pg-pool';
import { runAllMigrations } from '../infra/migrations/runMigrations';
import { Pool } from 'pg';
import { globSync } from 'glob';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

interface CommandLineArgs {
  tables: string[];
  domain?: string;
  all: boolean;
  fromDriftReport?: string;
  help: boolean;
}

function parseArgs(): CommandLineArgs {
  const args: CommandLineArgs = { tables: [], all: false, help: false };
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--help') args.help = true;
    else if (arg === '--all') args.all = true;
    else if (arg === '--table' && i + 1 < process.argv.length) args.tables.push(process.argv[++i]);
    else if (arg === '--domain' && i + 1 < process.argv.length) args.domain = process.argv[++i];
    else if (arg === '--from-drift-report' && i + 1 < process.argv.length) args.fromDriftReport = process.argv[++i];
  }
  return args;
}

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

function readTablesFromDriftReport(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const regex = /\[DRIFT\] Projection '[^']*' \(table '([^']*)'\):/g;
    const tables: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match[1]) tables.push(match[1]);
    }
    return tables;
  } catch (error: any) {
    console.error(`Error reading drift report file: ${error.message || error}`);
    process.exit(1);
    return [];
  }
}

interface ProjectionMeta {
  table: string;
  columnTypes: Record<string, string>;
  eventTypes: string[];
}

function discoverProjectionRegistries() {
  const results: {
    meta: ProjectionMeta;
    registerHandlers: (pool: any) => any[];
    registerFile: string;
  }[] = [];
  const registerFiles = globSync('src/core/**/read-models/register.ts', { absolute: true });
  for (const file of registerFiles) {
    delete require.cache[require.resolve(file)];
    const mod = require(file);
    if (mod.projectionMeta) {
      const metas = Array.isArray(mod.projectionMeta) ? mod.projectionMeta : [mod.projectionMeta];
      for (const meta of metas) {
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

async function fetchEvents(eventTypes: string[]): Promise<readonly any[]> {
  const pgPool = new Pool({
    host: process.env.LOCAL_DB_HOST || 'localhost',
    port: parseInt(process.env.LOCAL_DB_PORT || '5432'),
    user: process.env.LOCAL_DB_USER || 'postgres',
    password: process.env.LOCAL_DB_PASSWORD || 'postgres',
    database: process.env.LOCAL_DB_NAME || 'postgres',
  });
  try {
    const result = await pgPool.query(`
      SELECT *, aggregate_id as "aggregateId" FROM infra.events
      WHERE type = ANY($1)
      ORDER BY created_at ASC
    `, [eventTypes]);
    return result.rows;
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
  await runAllMigrations(true);
  const pool = createPool();
  const events = await fetchEvents(eventTypes);
  const handlers = registerHandlers(pool);
  if (events.length && handlers.length) {
    for (const event of events) {
      for (const handler of handlers) {
        if (!handler.supportsEvent(event)) continue;
        try {
          await handler.on(event);
        } catch (err) {
          console.warn('Projection failed', { eventType: event.type, error: err });
        }
      }
    }
  }
  await pool.end();
  console.log(`[REPAIR] Repair for table '${table}' complete.`);
}

async function main() {
  const args = parseArgs();
  if (args.help) {
    showHelp();
    return;
  }
  const registries = discoverProjectionRegistries();
  if (!registries.length) {
    console.log('No projections found.');
    return;
  }
  let projectionsToBuild: Array<{ meta: ProjectionMeta; registerHandlers: any }> = [];
  if (args.fromDriftReport) {
    const tablesToRepair = readTablesFromDriftReport(args.fromDriftReport);
    projectionsToBuild = registries.filter(({ meta }) => tablesToRepair.includes(meta.table));
  } else if (args.tables.length > 0) {
    projectionsToBuild = registries.filter(({ meta }) => args.tables.includes(meta.table));
  } else if (args.domain) {
    projectionsToBuild = registries.filter(({ registerFile }) => {
      const domainMatch = registerFile.match(/src\/core\/([^/]+)/);
      return domainMatch && domainMatch[1] === args.domain;
    });
  } else if (args.all) {
    projectionsToBuild = registries;
  } else {
    console.error('Error: Must specify one of --table, --domain, --all, or --from-drift-report');
    showHelp();
    process.exit(1);
  }
  if (projectionsToBuild.length === 0) {
    console.error('No matching projections found for the specified filters.');
    process.exit(1);
  }
  for (const { meta, registerHandlers } of projectionsToBuild) {
    console.log(`\n[REPAIR] Repairing projection for table '${meta.table}'...`);
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
