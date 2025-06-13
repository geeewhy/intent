"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = step;
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = __importDefault(require("fs/promises"));
const umzug_1 = require("umzug");
/**
 * Apply database schema migrations
 * @param ctx Flow context
 */
async function step(ctx) {
    ctx.logger.info('Applying database schema migrations');
    // Get connection pool from context
    const pool = ctx.vars.pool;
    if (!pool) {
        throw new Error('Database connection pool not found in context');
    }
    // Get migrations directory
    const migrationsDir = node_path_1.default.join(ctx.artifactsDir, 'migrations');
    ctx.logger.info(`Using migrations from ${migrationsDir}`);
    // Initialize Umzug
    const umzug = new umzug_1.Umzug({
        migrations: {
            glob: node_path_1.default.join(migrationsDir, '*.sql'),
            resolve: ({ name, path }) => ({
                name,
                up: async () => {
                    ctx.logger.info(`Applying migration: ${name}`);
                    if (!path) {
                        throw new Error(`Migration path is undefined for ${name}`);
                    }
                    const sql = await promises_1.default.readFile(path, { encoding: 'utf8' });
                    return pool.query(sql);
                },
                down: async () => {
                    ctx.logger.warn(`No down migration available for ${name}`);
                }
            })
        },
        storage: {
            async logMigration({ name }) {
                await pool.query('INSERT INTO "infra".migrations_eventstream(name) VALUES($1) ON CONFLICT DO NOTHING', [name]);
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
    }
    catch (error) {
        ctx.logger.error(`Failed to create migrations table: ${error.message}`);
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
    }
    catch (error) {
        ctx.logger.error(`Migration failed: ${error.message}`);
        throw error;
    }
    ctx.logger.raw('-----');
    ctx.logger.info(`⚠️ If this is your initial setup, please do not forget to run:️\n ↳ npm run projections:migrate\n to complete the setup with initial projection migrations.\n-----`);
}
//# sourceMappingURL=schema.js.map