"use strict";
/*

OBSOLETE

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
exports.runAllMigrations = runAllMigrations;
//src/infra/migrations/runMigrations.ts
const umzug_1 = require("umzug");
const glob_1 = require("glob");
const pg_1 = require("pg");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const genRlsSql_1 = require("../projections/genRlsSql");
const crypto_1 = __importDefault(require("crypto"));
dotenv.config();
/**
 * Creates a stable hash of a SQL string
 * @param sql SQL string to hash
 * @returns First 8 characters of the SHA-256 hash
 */
function hashSql(sql) {
    return crypto_1.default.createHash('sha256').update(sql).digest('hex').slice(0, 8);
}
/**
 * Postgres storage adapter for Umzug
 */
class UmzugPostgresStorage {
    constructor(options) {
        this.options = options;
        // Ensure tableName is properly schema-qualified if it doesn't already include a schema
        if (!this.options.tableName.includes('.')) {
            this.options.tableName = `infra.${this.options.tableName}`;
        }
    }
    async logMigration({ name }) {
        const query = `
      INSERT INTO ${this.options.tableName} (name, executed_at)
      VALUES ($1, NOW())
    `;
        await this.options.pool.query(query, [name]);
    }
    async unlogMigration({ name }) {
        const query = `
      DELETE FROM ${this.options.tableName}
      WHERE name = $1
    `;
        await this.options.pool.query(query, [name]);
    }
    async executed() {
        try {
            const query = `
        SELECT name FROM ${this.options.tableName}
        ORDER BY executed_at
      `;
            const result = await this.options.pool.query(query);
            return result.rows.map((row) => row.name); // ✅ flat string array
        }
        catch (error) {
            const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${this.options.tableName} (
                                                               name TEXT PRIMARY KEY,
                                                               executed_at TIMESTAMP NOT NULL
        )
      `;
            await this.options.pool.query(createTableQuery);
            return [];
        }
    }
}
/**
 * Runs all migrations for read models
 * @param forceRls Whether to force reapplication of RLS policies
 */
async function runAllMigrations(forceRls = false) {
    const pool = new pg_1.Pool({
        host: process.env.LOCAL_DB_HOST || 'localhost',
        port: parseInt(process.env.LOCAL_DB_PORT || '5432'),
        user: process.env.LOCAL_DB_USER || 'postgres',
        password: process.env.LOCAL_DB_PASSWORD || 'postgres',
        database: process.env.LOCAL_DB_NAME || 'postgres',
    });
    const migrationDirs = (0, glob_1.globSync)('src/core/**/read-models/migrations');
    console.log(`Found ${migrationDirs.length} migration directories`);
    try {
        for (const dir of migrationDirs) {
            console.log(`Running migrations from ${dir}`);
            const umzug = new umzug_1.Umzug({
                migrations: {
                    glob: `${dir}/*.sql`,
                    resolve: ({ path: migrationPath, context }) => {
                        if (!migrationPath)
                            throw new Error(`Missing path for migration`);
                        const relativeName = path.relative(process.cwd(), migrationPath);
                        return {
                            name: relativeName,
                            up: async () => {
                                const sql = fs.readFileSync(migrationPath, 'utf8');
                                try {
                                    console.log(`Running migration: ${relativeName}`);
                                    return context.query(sql);
                                }
                                catch (error) {
                                    console.error(`Migration failed: ${relativeName}`, error);
                                    throw error;
                                }
                            },
                            down: async () => {
                                console.log(`Down migration not supported for ${relativeName}`);
                            },
                        };
                    },
                },
                context: pool,
                storage: new UmzugPostgresStorage({ pool, tableName: 'migrations' }),
                logger: console,
            });
            await umzug.up();
        }
        console.log('All migrations completed successfully');
        // Generate and apply RLS policies
        console.log('Generating RLS policies...');
        const rlsPolicies = await (0, genRlsSql_1.generateRlsPolicies)();
        if (rlsPolicies.length > 0) {
            console.log(`Applying ${rlsPolicies.length} RLS policies...`);
            // When force mode is enabled, we use a timestamp in the migration name
            // This ensures that all policies are reapplied regardless of their content
            // Create a new Umzug instance for RLS policies
            const rlsUmzug = new umzug_1.Umzug({
                migrations: rlsPolicies.map((policy, index) => {
                    const sqlHash = hashSql(policy.createPolicyQuery);
                    const policyName = forceRls
                        ? `rls-policy-${policy.tableName}-${policy.condition}-forced-${new Date().getTime()}`
                        : `rls-policy-${policy.tableName}-${policy.condition}-${sqlHash}`;
                    return {
                        name: policyName,
                        up: async () => {
                            console.log(`Running RLS policy migration`, policy);
                            // Execute the RLS policy SQL statements
                            await pool.query(policy.enableRlsQuery);
                            await pool.query(policy.dropPolicyQuery);
                            await pool.query(policy.createPolicyQuery);
                            // Execute the comment policy SQL statement if it exists
                            if (policy.commentPolicyQuery) {
                                await pool.query(policy.commentPolicyQuery);
                            }
                            return Promise.resolve();
                        },
                        down: async () => {
                            console.log(`Down migration not supported for RLS policy ${policyName}`);
                            return Promise.resolve();
                        }
                    };
                }),
                context: pool,
                storage: new UmzugPostgresStorage({ pool, tableName: 'rls_policy_migrations' }),
                logger: console,
            });
            await rlsUmzug.up();
            console.log('RLS policies applied successfully');
        }
        else {
            console.log('No RLS policies to apply');
        }
    }
    finally {
        await pool.end();
    }
}
// If this file is run directly, run all migrations
if (require.main === module) {
    // Check if --force-rls flag is present
    const forceRls = process.argv.includes('--force-rls');
    if (forceRls) {
        console.log('Force RLS mode enabled - all RLS policies will be reapplied');
    }
    runAllMigrations(forceRls)
        .then(() => process.exit(0))
        .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=runMigrations.js.map