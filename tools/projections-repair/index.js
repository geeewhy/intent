#!/usr/bin/env ts-node
"use strict";
/**
 * Projection Drift Repair Tool
 *
 * This tool repairs drift between projection definitions in code and actual database tables
 * by rebuilding tables or replaying events.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const minimist_1 = __importDefault(require("minimist"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const migrations_pg_1 = require("../../infra/projections/migrations-pg");
const pg_pool_1 = require("../../infra/projections/pg-pool");
const scanner_1 = require("../../infra/projections/migrations-pg/scanner");
const dotenv = __importStar(require("dotenv"));
const pg_1 = require("pg");
const pg_query_stream_1 = __importDefault(require("pg-query-stream"));
const slonik_1 = require("slonik");
dotenv.config();
const EVENT_STREAM_BATCH_SIZE = 1000;
const CP_CHECKPOINT_SIZE = 10000;
const poolConnectionConfig = {
    host: process.env.LOCAL_DB_HOST ?? 'localhost',
    port: +(process.env.LOCAL_DB_PORT ?? '5432'),
    user: process.env.LOCAL_DB_USER ?? 'postgres',
    password: process.env.LOCAL_DB_PASSWORD ?? 'postgres',
    database: process.env.LOCAL_DB_NAME ?? 'postgres',
};
// cli options
const argv = (0, minimist_1.default)(process.argv.slice(2), {
    string: ['table', 'projection', 'drift-report'],
    boolean: ['all', 'resume', 'help', 'h'],
    alias: { h: 'help' },
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
async function prepareCheckpoints(table, client) {
    await client.query(`BEGIN`);
    await client.query(`
    CREATE TEMP TABLE cp_checkpoints (
      aggregate_id uuid PRIMARY KEY,
      last_version int
    ) ON COMMIT PRESERVE ROWS;
  `);
    // Pull projection+event gaps directly and bulk-insert
    //  stream results in chunks to avoid client memory blow-up
    const streamQuery = (0, slonik_1.sql) `
      WITH projection_checkpoint AS (
          SELECT e.aggregate_id, p.last_event_version
            FROM ${slonik_1.sql.identifier([table])} p
            JOIN infra.events e ON e.id = p.last_event_id
      ), latest_event AS (
          SELECT aggregate_id, MAX(version) AS latest_event_version
            FROM infra.events GROUP BY aggregate_id
      )
      SELECT l.aggregate_id,
             COALESCE(pc.last_event_version,0)::int AS last_version
        FROM latest_event l
   LEFT JOIN projection_checkpoint pc USING (aggregate_id)`;
    const qs = new pg_query_stream_1.default(streamQuery.sql, [], { batchSize: CP_CHECKPOINT_SIZE });
    const stream = client.query(qs);
    let inserted = 0;
    const rows = [];
    const vals = [];
    let p = 1;
    for await (const r of stream) {
        rows.push(`($${p++}, $${p++})`);
        vals.push(r.aggregate_id, r.last_version);
        inserted++;
        if (rows.length === 1000) {
            await client.query(`INSERT INTO cp_checkpoints VALUES ${rows.join(',')}`, vals);
            rows.length = 0;
            vals.length = 0;
            p = 1;
        }
    }
    if (rows.length)
        await client.query(`INSERT INTO cp_checkpoints VALUES ${rows.join(',')}`, vals);
    await client.query(`ANALYZE cp_checkpoints`);
    return inserted;
}
// read checkpoints helper
async function fetchCheckpoints(table) {
    const pool = (0, pg_pool_1.createPool)();
    const rows = await pool.query((0, slonik_1.sql) `
        WITH projection_checkpoint AS (SELECT e.aggregate_id,
                                              p.last_event_version
                                       FROM ${slonik_1.sql.identifier([table])} p
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
    const tuples = rows.rows
        .filter((r) => r.aggregateId !== null)
        .map((r) => [
        r.aggregateId,
        {
            last: Number(r.last_event_version ?? 0),
            latest: Number(r.latest_event_version),
        },
    ]);
    return new Map(tuples);
}
/* ---------- stream function (delta mode) --------------------------- */
async function streamDelta(eventTypes, client, processEvent) {
    const qs = new pg_query_stream_1.default(`
      SELECT e.*, e.aggregate_id AS "aggregateId"
        FROM infra.events e
        JOIN cp_checkpoints c USING (aggregate_id)
       WHERE e.type = ANY($1)
         AND e.version > c.last_version
       ORDER BY e.created_at`, [eventTypes], { batchSize: EVENT_STREAM_BATCH_SIZE });
    const stream = client.query(qs);
    for await (const ev of stream) {
        await processEvent(ev);
    }
    console.log(`[DELTA] Finished delta streaming events for ${eventTypes.join(',')}`);
}
//--- discover projections via scanner
const scanned = (0, scanner_1.scanProjections)(); // authoritative list
const metaById = new Map(scanned.map(p => [p.name, p]));
const metaByTable = new Map(scanned.flatMap(p => p.tables.map(t => [t, p])));
function loadRegistry(pMeta) {
    const registerFile = path.join(pMeta.dir, 'register.ts');
    if (!fs.existsSync(registerFile))
        throw new Error(`register.ts missing for projection '${pMeta.name}' (${registerFile})`);
    delete require.cache[require.resolve(registerFile)];
    const mod = require(registerFile);
    if (!mod.projectionMeta)
        throw new Error(`projectionMeta export missing in ${registerFile}`);
    const metas = Array.isArray(mod.projectionMeta) ? mod.projectionMeta : [mod.projectionMeta];
    // Look for a function named registerXXXProjections or register
    const regFn = mod.registerSystemProjections ||
        mod[`register${pMeta.name.charAt(0).toUpperCase() + pMeta.name.slice(1)}Projections`] ||
        Object.values(mod).find(v => typeof v === 'function' && v.name.includes('Projection'));
    if (typeof regFn !== 'function')
        throw new Error(`No register function found in ${registerFile}`);
    return metas.map((m) => {
        // Handle both old and new projection metadata formats
        const meta = {
            // For the new format with tables array, filter to only include tables that have migration files
            tables: m.tables
                ? m.tables.map((t) => t.name).filter((t) => pMeta.tables.includes(t))
                : (pMeta.tables.includes(m.table) ? [m.table] : []),
            // For the new format with eventTypes array
            eventTypes: m.eventTypes || (m.table ? [m.table] : []),
            // Keep the original metadata for reference
            original: m
        };
        return {
            meta,
            registerHandlers: regFn,
            projectionId: pMeta.name,
        };
    });
}
// --- stream events to prevent memory hogs
async function streamEvents(eventTypes, processEvent) {
    const pg = new pg_1.Pool(poolConnectionConfig);
    const client = await pg.connect();
    try {
        const qs = new pg_query_stream_1.default(`select *, aggregate_id as "aggregateId"
             from infra.events
             where type = any ($1)
             order by created_at`, [eventTypes], { batchSize: EVENT_STREAM_BATCH_SIZE });
        const stream = client.query(qs);
        for await (const row of stream)
            await processEvent(row);
    }
    finally {
        client.release();
        await pg.end();
    }
}
async function main() {
    let targets = [];
    if (argv['drift-report']) {
        const drift = JSON.parse(fs.readFileSync(argv['drift-report'], 'utf8'));
        // Handle both old and new drift report formats
        if (drift[0] && drift[0].tables) {
            // New format with tables array
            const projections = drift.filter((e) => e.tables && e.tables.some((t) => t.issues && t.issues.length > 0));
            for (const projection of projections) {
                const p = metaById.get(projection.projection);
                if (!p) {
                    console.error(`Projection '${projection.projection}' not recognised`);
                }
                else {
                    targets.push(...loadRegistry(p));
                }
            }
        }
        else {
            // Old format with single table
            const tables = drift.filter((e) => e.issues?.length).map((e) => e.table);
            tables.forEach(t => {
                const p = metaByTable.get(t);
                if (!p)
                    console.error(`Table '${t}' not recognised`);
                else
                    targets.push(...loadRegistry(p));
            });
        }
    }
    else if (argv.table) {
        const p = metaByTable.get(argv.table);
        if (!p) {
            console.error(`Unknown table '${argv.table}'`);
            process.exit(1);
        }
        targets = loadRegistry(p);
    }
    else if (argv.projection) {
        const p = metaById.get(argv.projection);
        if (!p) {
            console.error(`Unknown projection '${argv.projection}'`);
            process.exit(1);
        }
        targets = loadRegistry(p);
    }
    else if (argv.all) {
        // Only process projections with tables that have migration files
        scanned.filter(p => p.tables.length > 0).forEach(p => targets.push(...loadRegistry(p)));
    }
    else {
        console.error('Must specify --table, --projection, --all, or --drift-report');
        process.exit(1);
    }
    if (!targets.length) {
        console.error('Nothing to repair');
        process.exit(1);
    }
    const mode = argv.resume ? 'RESUME' : 'REPAIR';
    for (const t of targets) {
        const pg = new pg_1.Pool(poolConnectionConfig);
        const poolClient = await pg.connect();
        let projectionPool = null;
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
                projectionPool = (0, pg_pool_1.createPool)();
                if (!argv.resume) {
                    // Don't pass the Slonik pool to runMigrations, let it create its own pg Pool
                    await (0, migrations_pg_1.runMigrations)(['--rebuild-from-table', table]); // full rebuild
                }
                const handlers = t.registerHandlers(projectionPool);
                let count = 0;
                const streamer = argv.resume
                    ? streamDelta(t.meta.eventTypes, poolClient, replay)
                    : streamEvents(t.meta.eventTypes, replay);
                async function replay(ev) {
                    for (const h of handlers)
                        if (h.supportsEvent(ev))
                            await h.on(ev);
                    count++;
                }
                await streamer;
                console.log(`[${mode}] Finished ${table} (${count} events)`);
                if (count > 0) {
                    console.log(`[OK] ${table} processed ${count} events for ${t.meta.eventTypes.join(',')}`);
                }
                else {
                    console.log(`[OK] Projection table ${table} is not behind current events of ${t.meta.eventTypes.join(',')}`);
                }
                // Close the pool for this table
                if (projectionPool) {
                    await projectionPool.end();
                    projectionPool = null;
                }
            }
        }
        finally {
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
if (require.main === module)
    main();
//# sourceMappingURL=index.js.map