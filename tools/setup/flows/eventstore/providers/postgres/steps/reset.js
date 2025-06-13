"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = step;
const prompt_1 = require("../../../../../shared/prompt");
/**
 * Reset database tables
 * @param ctx Flow context
 */
async function step(ctx) {
    ctx.logger.info('Preparing to reset event store tables');
    // Get connection pool from context
    const pool = ctx.vars.pool;
    if (!pool) {
        throw new Error('Database connection pool not found in context');
    }
    // Check if tables exist
    const tables = await checkTablesExist(pool);
    if (tables.length === 0) {
        ctx.logger.info('No event store tables found to reset');
        return;
    }
    ctx.logger.warn(`Found ${tables.length} event store tables: ${tables.join(', ')}`);
    // Prompt for confirmation
    const hasYesFlag = ctx.vars.yes || process.argv.includes('--yes') || process.argv.includes('-Y');
    if (!hasYesFlag) {
        const confirmed = await (0, prompt_1.promptYesNo)('WARNING: This will permanently delete all data in the event store tables. Continue?', false);
        if (!confirmed) {
            ctx.logger.info('Reset operation cancelled by user');
            return;
        }
    }
    else {
        ctx.logger.info('Automatically confirming reset (--yes flag is set)');
    }
    // Drop tables
    try {
        ctx.logger.info('Dropping event store tables...');
        //try removing schema altogether
        try {
            await pool.query('SELECT pg_terminate_backend(pid)\n' +
                'FROM   pg_stat_activity\n' +
                'WHERE  datname = current_database()\n' +
                '  AND  pid <> pg_backend_pid();\n');
            await pool.query('DROP SCHEMA IF EXISTS "infra" CASCADE');
            ctx.logger.info('Schema dropped');
        }
        catch (e) {
            ctx.logger.warn(`Could not drop schema ${String(e)}`);
            // Drop migrations table
            if (tables.includes('migrations_eventstream')) {
                await pool.query('DROP TABLE IF EXISTS "infra"."migrations_eventstream" CASCADE');
                ctx.logger.info('Dropped migrations table');
            }
            // Drop aggregates table
            if (tables.includes('aggregates')) {
                await pool.query('DROP TABLE IF EXISTS "infra"."aggregates" CASCADE');
                ctx.logger.info('Dropped aggregates table');
            }
            // Drop commands table
            if (tables.includes('commands')) {
                await pool.query('DROP TABLE IF EXISTS "infra"."commands" CASCADE');
                ctx.logger.info('Dropped commands table');
            }
            // Drop events table
            if (tables.includes('events')) {
                await pool.query('DROP TABLE IF EXISTS "infra"."events" CASCADE');
                ctx.logger.info('Dropped events table');
            }
            ctx.logger.info('Event store tables reset successfully');
        }
    }
    catch (error) {
        ctx.logger.error(`Failed to drop tables: ${error.message}`);
        throw error;
    }
}
/**
 * Check which event store tables exist
 * @param pool Database connection pool
 * @returns Array of table names that exist
 */
async function checkTablesExist(pool) {
    const result = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name IN ('events', 'aggregates', 'commands', 'migrations_eventstream')
          AND table_schema = 'infra'
    `);
    return result.rows.map(row => row.table_name);
}
//# sourceMappingURL=reset.js.map