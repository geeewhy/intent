"use strict";
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
exports.runMigrations = runMigrations;
const umzug_1 = require("umzug");
const pg_1 = require("pg");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const scanner_1 = require("./scanner");
const planner_1 = require("./planner");
const storage_1 = require("./storage");
const genRlsSql_1 = require("../genRlsSql");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const SCHEMA_LOG = 'infra.migrations_projections_schema';
const RLS_LOG = 'infra.migrations_projections_rls_policies';
const tableToProjection = new Map();
(0, scanner_1.scanProjections)().forEach(p => p.tables.forEach(t => tableToProjection.set(t, p.name)));
// Create a default pool configuration
const defaultPoolConfig = {
    host: process.env.LOCAL_DB_HOST ?? 'localhost',
    port: parseInt(process.env.LOCAL_DB_PORT ?? '5432', 10),
    user: process.env.LOCAL_DB_USER ?? 'postgres',
    password: process.env.LOCAL_DB_PASSWORD ?? 'postgres',
    database: process.env.LOCAL_DB_NAME ?? 'postgres',
};
const hashSql = (sql) => crypto_1.default.createHash('sha256').update(sql).digest('hex').slice(0, 8);
async function runMigrations(argv = [], existingPool) {
    const allProjections = (0, scanner_1.scanProjections)();
    const plan = (0, planner_1.buildPlan)(allProjections, argv);
    const pool = existingPool || new pg_1.Pool(defaultPoolConfig);
    const shouldClosePool = !existingPool; // Only close the pool if we created it
    try {
        await dropTables(plan, pool);
        await runSchema(plan, pool);
        await runRls(plan, pool);
    }
    finally {
        if (shouldClosePool) {
            await pool.end();
        }
    }
}
/* ---------- helpers ---------------------------------------------------- */
async function dropTables(plan, pool) {
    const toDrop = new Set(plan.rebuild.tables);
    plan.rebuild.projections.forEach(p => p.tables.forEach(t => toDrop.add(t)));
    for (const t of toDrop) {
        console.log(`[DROP] ${t}`);
        await pool.query(`drop table if exists ${t} cascade`);
    }
}
async function runSchema(plan, pool) {
    for (const p of plan.projections) {
        const forced = plan.rebuild.projections.includes(p) ||
            p.tables.some(t => plan.rebuild.tables.includes(t));
        const storage = new storage_1.UmzugPgStorage(pool, SCHEMA_LOG);
        const umzug = new umzug_1.Umzug({
            migrations: {
                glob: `${p.migrationsDir}/*.sql`,
                resolve: ({ path: mig }) => {
                    const rawSql = fs.readFileSync(mig, 'utf8');
                    const sqlHash = hashSql(rawSql);
                    /* timestamp → guarantees new row when forced */
                    const base = path.relative(process.cwd(), mig);
                    const name = forced ? `${base}-forced-${Date.now()}` : base;
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
                        down: async () => { },
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
async function runRls(plan, pool) {
    const policies = await (0, genRlsSql_1.generateRlsPolicies)();
    const storage = new storage_1.UmzugPgStorage(pool, RLS_LOG);
    const migrations = policies.map(pol => {
        const sqlHash = hashSql(pol.createPolicyQuery);
        const forced = plan.forceRls;
        const baseName = `rls-${pol.tableName}-${sqlHash}`;
        const name = forced ? `${baseName}-forced-${Date.now()}` : baseName;
        const projection = tableToProjection.get(pol.tableName) ?? null;
        return {
            name,
            up: async () => {
                await pool.query(pol.enableRlsQuery);
                await pool.query(pol.dropPolicyQuery);
                await pool.query(pol.createPolicyQuery);
                if (pol.commentPolicyQuery)
                    await pool.query(pol.commentPolicyQuery);
                await storage.attachMeta(name, {
                    projection,
                    tables: [pol.tableName],
                    sqlHash,
                    forced,
                });
            },
            down: async () => { },
        };
    });
    await new umzug_1.Umzug({
        migrations,
        context: pool,
        storage,
        logger: console,
    }).up();
}
//# sourceMappingURL=executor.js.map