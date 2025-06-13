"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = step;
const prompt_1 = require("../../../../../shared/prompt");
const validation_1 = require("../../../../../shared/validation");
const pg_1 = __importDefault(require("pg"));
/**
 * Set up database connection
 * @param ctx Flow context
 */
async function step(ctx) {
    ctx.logger.info('Setting up database connection');
    // Get connection parameters
    const connection = await getConnectionParameters(ctx);
    // Create connection pool
    ctx.logger.info(`Connecting to PostgreSQL at ${connection.host}:${connection.port}`);
    const pool = new pg_1.default.Pool({
        host: connection.host,
        port: connection.port,
        user: connection.user,
        password: connection.password,
        database: connection.database,
    });
    // Test connection
    try {
        const result = await pool.query('SELECT NOW()');
        ctx.logger.info(`Connected to PostgreSQL: ${result.rows[0].now}`);
    }
    catch (error) {
        ctx.logger.error(`Failed to connect to PostgreSQL: ${error.message}`);
        throw error;
    }
    // Store connection pool in context for use by other steps
    ctx.vars.pool = pool;
    ctx.vars.connection = connection;
    ctx.logger.info('Database connection setup complete');
}
/**
 * Get connection parameters from environment or prompt
 * @param ctx Flow context
 * @returns Connection parameters
 */
async function getConnectionParameters(ctx) {
    // Check if connection parameters are already in environment variables
    if (process.env.LOCAL_DB_HOST &&
        process.env.LOCAL_DB_USER &&
        process.env.LOCAL_DB_NAME) {
        ctx.logger.info('Using connection parameters from environment variables');
        const connection = {
            host: process.env.LOCAL_DB_HOST,
            port: process.env.LOCAL_DB_PORT ? parseInt(process.env.LOCAL_DB_PORT, 10) : 5432,
            user: process.env.LOCAL_DB_USER,
            password: process.env.LOCAL_DB_PASSWORD,
            database: process.env.LOCAL_DB_NAME,
        };
        // Validate connection parameters
        return validation_1.postgresConnectionSchema.parse(connection);
    }
    // If --yes flag is set, use default values without prompting
    // Check both ctx.vars.yes and process.argv for --yes or -Y
    const hasYesFlag = ctx.vars.yes || process.argv.includes('--yes') || process.argv.includes('-Y');
    if (hasYesFlag) {
        ctx.logger.info('Using default connection parameters (--yes flag is set)');
        const connection = {
            host: 'localhost',
            port: 5432,
            user: 'postgres',
            password: 'postgres',
            database: 'eventstore',
        };
        // Validate connection parameters
        return validation_1.postgresConnectionSchema.parse(connection);
    }
    // Prompt for connection parameters
    ctx.logger.info('Please provide PostgreSQL connection parameters');
    const connection = {
        host: await (0, prompt_1.promptText)('Host:', 'localhost'),
        port: parseInt(await (0, prompt_1.promptText)('Port:', '5432'), 10),
        user: await (0, prompt_1.promptText)('User:', 'postgres'),
        password: await (0, prompt_1.promptText)('Password:', 'postgres'),
        database: await (0, prompt_1.promptText)('Database:', 'eventstore'),
    };
    // Validate connection parameters
    return validation_1.postgresConnectionSchema.parse(connection);
}
//# sourceMappingURL=connection.js.map