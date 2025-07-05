#!/usr/bin/env ts-node
/**
 * Projection Drift Repair Tool
 * 
 * This tool repairs drift between projection definitions in code and actual database tables
 * by rebuilding tables or replaying events.
 */

import minimist from 'minimist';
import * as fs from 'fs';
import * as path from 'path';
import '../../core/initialize';          // side-effects populate the registry
import { getAllProjections, ProjectionDefinition } from '../../core/registry';
import {runMigrations} from '../../infra/projections/migrations-pg';
import {createPool} from '../../infra/projections/pg-pool';
import { createPgUpdaterFor } from '../../infra/projections/pg-updater';
import * as dotenv from 'dotenv';
import {Pool, PoolClient} from 'pg';
import QueryStream from 'pg-query-stream';
import {sql, DatabasePool} from "slonik";

dotenv.config();

const EVENT_STREAM_BATCH_SIZE = 1_000;
const CP_CHECKPOINT_SIZE = 10_000;

const poolConnectionConfig = {
    host: process.env.LOCAL_DB_HOST ?? 'localhost',
    port: +(process.env.LOCAL_DB_PORT ?? '5432'),
    user: process.env.LOCAL_DB_USER ?? 'postgres',
    password: process.env.LOCAL_DB_PASSWORD ?? 'postgres',
    database: process.env.LOCAL_DB_NAME ?? 'postgres',
}

// cli options
const argv = minimist(process.argv.slice(2), {
    string: ['table', 'projection', 'drift-report'],
    boolean: ['all', 'resume', 'help', 'h'],
    alias: {h: 'help'},
});

if (argv.help) {
    console.log(`Usage:
  --resume                 Replay only events newer than current table state
  --table <name>           Full rebuild of one table   (drops & replays ALL)
  --projection <id>        Full rebuild of one projection
  --all                    Full rebuild of every projection
  --drift-report <file>    Full rebuild for tables present in report
  --help, -h               Show help`);
    process.exit(0);
}

// helper for prepare checkpoints as a temp table
// returns how many rows inserted – optional
async function prepareCheckpoints(table: string, client: PoolClient): Promise<number> {
    await client.query(`BEGIN`);
    await client.query(`
    CREATE TEMP TABLE cp_checkpoints (
      aggregate_id uuid PRIMARY KEY,
      last_version int
    ) ON COMMIT PRESERVE ROWS;
  `);

    // Pull projection+event gaps directly and bulk-insert
    //  stream results in chunks to avoid client memory blow-up
    const streamQuery = sql`
      WITH projection_checkpoint AS (
          SELECT e.aggregate_id, p.last_event_version
            FROM ${sql.identifier([table])} p
            JOIN infra.events e ON e.id = p.last_event_id
      ), latest_event AS (
          SELECT aggregate_id, MAX(version) AS latest_event_version
            FROM infra.events GROUP BY aggregate_id
      )
      SELECT l.aggregate_id,
             COALESCE(pc.last_event_version,0)::int AS last_version
        FROM latest_event l
   LEFT JOIN projection_checkpoint pc USING (aggregate_id)`;
    const qs = new QueryStream(streamQuery.sql,
        [],
        { batchSize: CP_CHECKPOINT_SIZE },
    );

    const stream = client.query(qs);
    let inserted = 0;
    const rows: string[] = [];
    const vals: any[]    = [];
    let p = 1;

    for await (const r of stream) {
        rows.push(`($${p++}, $${p++})`);
        vals.push(r.aggregate_id, r.last_version);
        inserted++;

        if (rows.length === 1_000) {
            await client.query(`INSERT INTO cp_checkpoints VALUES ${rows.join(',')}`, vals);
            rows.length = 0; vals.length = 0; p = 1;
        }
    }
    if (rows.length) await client.query(`INSERT INTO cp_checkpoints VALUES ${rows.join(',')}`, vals);

    await client.query(`ANALYZE cp_checkpoints`);
    return inserted;
}


// read checkpoints helper
async function fetchCheckpoints(table: string) {
    const pool = createPool();
    const rows = await pool.query(sql`
        WITH projection_checkpoint AS (SELECT e.aggregate_id,
                                              p.last_event_version
                                       FROM ${sql.identifier([table])} p
                                                JOIN infra.events e ON e.id = p.last_event_id),
             latest_event AS (SELECT aggregate_id, MAX(version) AS latest_event_version
                              FROM infra.events
                              GROUP BY aggregate_id)
        SELECT l.aggregate_id AS                     "aggregateId",
               COALESCE(pc.last_event_version, 0) AS last_event_version,
               l.latest_event_version
        FROM latest_event l
                 LEFT JOIN projection_checkpoint pc
                           ON pc.aggregate_id = l.aggregate_id;
    `);

    type Checkpoint = { last: number; latest: number };

    const tuples = rows.rows
        .filter((r): r is {
                aggregateId: string;
                last_event_version: string | number;
                latest_event_version: string | number
            } =>
                r.aggregateId !== null,
        )
        .map(
            (r): [string, Checkpoint] => [
                r.aggregateId,
                {
                    last: Number(r.last_event_version ?? 0),
                    latest: Number(r.latest_event_version),
                },
            ],
        );

    return new Map<string, Checkpoint>(tuples);
}

/* ---------- stream function (delta mode) --------------------------- */
async function streamDelta(
    eventTypes: string[],
    client: PoolClient,
    processEvent: (ev:any)=>Promise<void>,
) {
    const qs = new QueryStream(`
      SELECT e.*, e.aggregate_id AS "aggregateId"
        FROM infra.events e
        JOIN cp_checkpoints c USING (aggregate_id)
       WHERE e.type = ANY($1)
         AND e.version > c.last_version
       ORDER BY e.created_at`,
        [eventTypes],
        { batchSize: EVENT_STREAM_BATCH_SIZE },
    );
    const stream = client.query(qs);
    for await (const ev of stream) {
        await processEvent(ev);
    }
    console.log(`[DELTA] Finished delta streaming events for ${eventTypes.join(',')}`);
}

//--- discover projections via registry
const projections = getAllProjections();             // { id -> ProjectionDefinition }

const byId = new Map(Object.entries(projections));    // id -> def
const byTable = new Map<string, [string, ProjectionDefinition]>();
for (const [id, def] of Object.entries(projections))
    def.tables.forEach(t => byTable.set(t.name, [id, def]));

/** @deprecated – no longer used by repair tool */
interface ProjectionMeta {
    name: string;
    dir: string;
    migrationsDir: string;
    tables: string[];
}

/** @deprecated – no longer used by repair tool */
function loadRegistry(pMeta: ProjectionMeta) {
    const registerFile = path.join(pMeta.dir, 'register.ts');
    if (!fs.existsSync(registerFile))
        throw new Error(`register.ts missing for projection '${pMeta.name}' (${registerFile})`);

    delete require.cache[require.resolve(registerFile)];
    const mod = require(registerFile);

    if (!mod.projectionMeta) throw new Error(`projectionMeta export missing in ${registerFile}`);

    const metas = Array.isArray(mod.projectionMeta) ? mod.projectionMeta : [mod.projectionMeta];
    // Look for a function named registerXXXProjections or register
    const regFn = mod.registerSystemProjections || 
                 mod[`register${pMeta.name.charAt(0).toUpperCase() + pMeta.name.slice(1)}Projections`] ||
                 Object.values(mod).find(v => typeof v === 'function' && v.name.includes('Projection'));

    if (typeof regFn !== 'function')
        throw new Error(`No register function found in ${registerFile}`);

    return metas.map((m: any) => {
        // Handle both old and new projection metadata formats
        const meta = {
            // For the new format with tables array, filter to only include tables that have migration files
            tables: m.tables 
                ? m.tables.map((t: any) => t.name).filter((t: string) => pMeta.tables.includes(t))
                : (pMeta.tables.includes(m.table) ? [m.table] : []),
            // For the new format with eventTypes array
            eventTypes: m.eventTypes || (m.table ? [m.table] : []),
            // Keep the original metadata for reference
            original: m
        };

        return {
            meta,
            registerHandlers: regFn as (pool: any) => any[],
            projectionId: pMeta.name,
        };
    });
}

// --- stream events to prevent memory hogs
async function streamEvents(
    eventTypes: string[],
    processEvent: (ev: any) => Promise<void>,
) {
    const pg = new Pool(poolConnectionConfig);
    const client = await pg.connect();

    try {
        const qs = new QueryStream(
            `select *, aggregate_id as "aggregateId"
             from infra.events
             where type = any ($1)
             order by created_at`,
            [eventTypes],
            {batchSize: EVENT_STREAM_BATCH_SIZE},
        );

        const stream = client.query(qs);
        for await (const row of stream) await processEvent(row);
    } finally {
        client.release();
        await pg.end();
    }
}

export async function main() {
    let targets: ReturnType<typeof loadRegistry>[number][] = [];

    if (argv['drift-report']) {
        const drift = JSON.parse(fs.readFileSync(argv['drift-report'], 'utf8'));

        // Handle both old and new drift report formats
        if (drift[0] && drift[0].tables) {
            // New format with tables array
            const projections = drift.filter((e: any) => 
                e.tables && e.tables.some((t: any) => t.issues && t.issues.length > 0)
            );

            for (const projection of projections) {
                const def = byId.get(projection.projection);
                if (!def) {
                    console.error(`Projection '${projection.projection}' not recognised`);
                } else {
                    targets.push({
                        meta: {
                            tables: def.tables.map(t => t.name),
                            eventTypes: def.eventTypes,
                            original: def
                        },
                        projectionId: projection.projection,
                        def
                    });
                }
            }
        } else {
            // Old format with single table
            const tables: string[] = drift.filter((e: any) => e.issues?.length).map((e: any) => e.table);
            tables.forEach(t => {
                const entry = byTable.get(t);
                if (!entry) console.error(`Table '${t}' not recognised`);
                else {
                    const [id, def] = entry;
                    targets.push({
                        meta: {
                            tables: def.tables.map(t => t.name),
                            eventTypes: def.eventTypes,
                            original: def
                        },
                        projectionId: id,
                        def
                    });
                }
            });
        }
    } else if (argv.table) {
        const entry = byTable.get(argv.table);
        if (!entry) {
            console.error(`Unknown table '${argv.table}'`);
            process.exit(1);
        }
        const [id, def] = entry;
        targets.push({
            meta: {
                tables: def.tables.map(t => t.name),
                eventTypes: def.eventTypes,
                original: def
            },
            projectionId: id,
            def
        });
    } else if (argv.projection) {
        const def = byId.get(argv.projection);
        if (!def) {
            console.error(`Unknown projection '${argv.projection}'`);
            process.exit(1);
        }
        targets.push({
            meta: {
                tables: def.tables.map(t => t.name),
                eventTypes: def.eventTypes,
                original: def
            },
            projectionId: argv.projection,
            def
        });
    } else if (argv.all) {
        // Process all projections from the registry
        for (const [id, def] of byId.entries()) {
            targets.push({
                meta: {
                    tables: def.tables.map(t => t.name),
                    eventTypes: def.eventTypes,
                    original: def
                },
                projectionId: id,
                def
            });
        }
    } else {
        console.error('Must specify --table, --projection, --all, or --drift-report');
        process.exit(1);
    }

    if (!targets.length) {
        console.error('Nothing to repair');
        process.exit(1);
    }

    const mode = argv.resume ? 'RESUME' : 'REPAIR';

    for (const t of targets) {
        const pg = new Pool(poolConnectionConfig);
        const poolClient = await pg.connect();
        let projectionPool: DatabasePool | null = null;

        try {
            // Process each table in the projection
            for (const table of t.meta.tables) {
                if (argv.resume) {
                    console.info(`[INFO] Preparing checkpoints for ${mode} mode`);
                    const rows = await prepareCheckpoints(table, poolClient);
                    console.info(`[INFO] Prepared ${rows} checkpoints in temp table`);
                }

                console.log(`\n[${mode}] Working on ${table}`);

                // Create a new pool for each table
                projectionPool = createPool();

                if (!argv.resume) {
                    // Don't pass the Slonik pool to runMigrations, let it create its own pg Pool
                    await runMigrations(['--rebuild-from-table', table]); // full rebuild
                }

                // Create handlers on the fly
                const updaterCache: Record<string, ReturnType<typeof createPgUpdaterFor>> = {};
                const getUpdater = (tbl: string) => {
                    if (!projectionPool) {
                        throw new Error('projectionPool is null');
                    }
                    return updaterCache[tbl] ?? (updaterCache[tbl] = createPgUpdaterFor(tbl, projectionPool));
                };

                const handler = t.def.factory(getUpdater);

                let count = 0;

                const streamer = argv.resume
                    ? streamDelta(t.meta.eventTypes, poolClient, replay)
                    : streamEvents(t.meta.eventTypes, replay);

                async function replay(ev: any) {
                    if (handler.supportsEvent(ev)) await handler.on(ev);
                    count++;
                }

                await streamer;

                console.log(`[${mode}] Finished ${table} (${count} events)`);
                if (count > 0) {
                    console.log(`[OK] ${table} processed ${count} events for ${t.meta.eventTypes.join(',')}`);
                } else {
                    console.log(`[OK] Projection table ${table} is not behind current events of ${t.meta.eventTypes.join(',')}`);
                }

                // Close the pool for this table
                if (projectionPool) {
                    await projectionPool.end();
                    projectionPool = null;
                }
            }
        } finally {
            // Release resources after processing all tables
            if (poolClient) {
                poolClient.release();
            }
            if (pg) {
                await pg.end();
            }
            if (projectionPool) {
                await projectionPool.end();
            }
        }
    }
    console.log('\n✅ Projection repair finished');
}

// Support programmatic execution
if (require.main === module) main();
