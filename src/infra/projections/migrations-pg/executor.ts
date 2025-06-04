import { Umzug } from 'umzug';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

import { scanProjections, ProjectionMeta } from './scanner';
import { buildPlan, MigrationPlan } from './planner';
import { UmzugPgStorage } from './storage';
import { generateRlsPolicies } from '../genRlsSql';
import * as dotenv from 'dotenv';
dotenv.config();

const SCHEMA_LOG = 'infra.migrations_projections_schema';
const RLS_LOG    = 'infra.migrations_projections_rls_policies';

const tableToProjection = new Map<string, string>();
scanProjections().forEach(p => p.tables.forEach(t => tableToProjection.set(t, p.name)));


// Create a default pool configuration
const defaultPoolConfig = {
    host:     process.env.LOCAL_DB_HOST ?? 'localhost',
    port:     parseInt(process.env.LOCAL_DB_PORT ?? '5432', 10),
    user:     process.env.LOCAL_DB_USER ?? 'postgres',
    password: process.env.LOCAL_DB_PASSWORD ?? 'postgres',
    database: process.env.LOCAL_DB_NAME ?? 'postgres',
};

const hashSql = (sql: string) =>
    crypto.createHash('sha256').update(sql).digest('hex').slice(0, 8);

export async function runMigrations(argv: string[] = [], existingPool?: Pool) {
    const allProjections = scanProjections();
    const plan = buildPlan(allProjections, argv);

    const pool = existingPool || new Pool(defaultPoolConfig);
    const shouldClosePool = !existingPool; // Only close the pool if we created it

    try {
        await dropTables(plan, pool);
        await runSchema(plan, pool);
        await runRls(plan, pool);
    } finally {
        if (shouldClosePool) {
            await pool.end();
        }
    }
}

/* ---------- helpers ---------------------------------------------------- */

async function dropTables(plan: MigrationPlan, pool: Pool) {
    const toDrop = new Set<string>(plan.rebuild.tables);
    plan.rebuild.projections.forEach(p => p.tables.forEach(t => toDrop.add(t)));
    for (const t of toDrop) {
        console.log(`[DROP] ${t}`);
        await pool.query(`drop table if exists ${t} cascade`);
    }
}

async function runSchema(plan: MigrationPlan, pool: Pool) {
    for (const p of plan.projections) {
        const forced =
            plan.rebuild.projections.includes(p) ||
            p.tables.some(t => plan.rebuild.tables.includes(t));

        const storage = new UmzugPgStorage(pool, SCHEMA_LOG);

        const umzug = new Umzug({
            migrations: {
                glob: `${p.migrationsDir}/*.sql`,
                resolve: ({ path: mig }) => {
                    const rawSql = fs.readFileSync(mig!, 'utf8');
                    const sqlHash = hashSql(rawSql);

                    /* timestamp → guarantees new row when forced */
                    const base    = path.relative(process.cwd(), mig!);
                    const name    = forced ? `${base}-forced-${Date.now()}` : base;

                    return {
                        name,
                        up: async () => {
                            await pool.query(rawSql);
                            await storage.attachMeta(name, {
                                projection: p.name,
                                tables: p.tables,
                                sqlHash,
                                forced,
                            });
                        },
                        down: async () => {},
                    };
                },
            },
            context: pool,
            storage,
            logger: console,
        });

        await umzug.up();
    }
}

async function runRls(plan: MigrationPlan, pool: Pool) {
    const policies = await generateRlsPolicies();
    const storage  = new UmzugPgStorage(pool, RLS_LOG);

    const migrations = policies.map(pol => {
        const sqlHash = hashSql(pol.createPolicyQuery);
        const forced  = plan.forceRls;
        const baseName = `rls-${pol.tableName}-${sqlHash}`;
        const name     = forced ? `${baseName}-forced-${Date.now()}` : baseName;

        const projection = tableToProjection.get(pol.tableName) ?? null;

        return {
            name,
            up: async () => {
                await pool.query(pol.enableRlsQuery);
                await pool.query(pol.dropPolicyQuery);
                await pool.query(pol.createPolicyQuery);
                if (pol.commentPolicyQuery) await pool.query(pol.commentPolicyQuery);

                await storage.attachMeta(name, {
                    projection,
                    tables: [pol.tableName],
                    sqlHash,
                    forced,
                });
            },
            down: async () => {},
        };
    });

    await new Umzug({
        migrations,
        context: pool,
        storage,
        logger: console,
    }).up();
}
