//src/tools/setup/flows/eventstore/providers/postgres/steps/connection.ts
/**
 * Set up database connection
 */
import { FlowCtx } from '../../../../../shared/types';
import { promptText } from '../../../../../shared/prompt';
import { postgresConnectionSchema, PostgresConnection } from '../../../../../shared/validation';
import pg from 'pg';

/**
 * Set up database connection
 * @param ctx Flow context
 */
export default async function step(ctx: FlowCtx): Promise<void> {
  ctx.logger.info('Setting up database connection');

  // Get connection parameters
  const connection = await getConnectionParameters(ctx);

  // First connect to the default 'postgres' database to check if our target database exists
  ctx.logger.info(`Connecting to PostgreSQL at ${connection.host}:${connection.port}`);
  const adminPool = new pg.Pool({
    host: connection.host,
    port: connection.port,
    user: connection.user,
    password: connection.password,
    database: 'postgres', // Connect to default postgres database
  });

  try {
    // Check if the target database exists
    const dbCheckResult = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [connection.database]
    );

    // If database doesn't exist, create it
    if (dbCheckResult.rowCount === 0) {
      ctx.logger.info(`Database '${connection.database}' does not exist, creating it...`);
      await adminPool.query(`CREATE DATABASE ${connection.database}`);
      ctx.logger.info(`Database '${connection.database}' created successfully`);
    } else {
      ctx.logger.info(`Database '${connection.database}' already exists`);
    }

    // Close the admin connection
    await adminPool.end();

    // Now connect to the target database
    const pool = new pg.Pool({
      host: connection.host,
      port: connection.port,
      user: connection.user,
      password: connection.password,
      database: connection.database,
    });

    // Test connection to the target database
    const result = await pool.query('SELECT NOW()');
    ctx.logger.info(`Connected to PostgreSQL: ${result.rows[0].now}`);

    // Check if the infra schema exists
    const schemaCheckResult = await pool.query(
      "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'infra'"
    );

    // If schema doesn't exist, create it
    if (schemaCheckResult.rowCount === 0) {
      ctx.logger.info("Schema 'infra' does not exist, creating it...");
      await pool.query('CREATE SCHEMA infra');
      ctx.logger.info("Schema 'infra' created successfully");
    } else {
      ctx.logger.info("Schema 'infra' already exists");
    }

    // Store connection pool and parameters in context for use by other steps
    ctx.vars.pool = pool;
    ctx.vars.connection = connection;
  } catch (error) {
    ctx.logger.error(`Failed to connect to PostgreSQL: ${(error as Error).message}`);
    throw error;
  }

  ctx.logger.info('Database connection setup complete');
}

/**
 * Get connection parameters from environment or prompt
 * @param ctx Flow context
 * @returns Connection parameters
 */
async function getConnectionParameters(ctx: FlowCtx): Promise<PostgresConnection> {
  // Check if connection parameters are already in environment variables
  if (
    process.env.LOCAL_DB_HOST &&
    process.env.LOCAL_DB_USER &&
    process.env.LOCAL_DB_NAME
  ) {
    ctx.logger.info('Using connection parameters from environment variables');

    const connection: PostgresConnection = {
      host: process.env.LOCAL_DB_HOST,
      port: process.env.LOCAL_DB_PORT ? parseInt(process.env.LOCAL_DB_PORT, 10) : 5432,
      user: process.env.LOCAL_DB_USER,
      password: process.env.LOCAL_DB_PASSWORD,
      database: process.env.LOCAL_DB_NAME,
    };

    // Validate connection parameters
    return postgresConnectionSchema.parse(connection);
  }

  // If --yes flag is set, use default values without prompting
  // Check both ctx.vars.yes and process.argv for --yes or -Y
  const hasYesFlag = ctx.vars.yes || process.argv.includes('--yes') || process.argv.includes('-Y');

  if (hasYesFlag) {
    ctx.logger.info('Using default connection parameters (--yes flag is set)');

    const connection: PostgresConnection = {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: 'intentdb',
    };

    // Validate connection parameters
    return postgresConnectionSchema.parse(connection);
  }

  // Prompt for connection parameters
  ctx.logger.info('Please provide PostgreSQL connection parameters');

  const connection: PostgresConnection = {
    host: await promptText('Host:', 'localhost'),
    port: parseInt(await promptText('Port:', '5432'), 10),
    user: await promptText('User:', 'postgres'),
    password: await promptText('Password:', 'postgres'),
    database: await promptText('Database:', 'intentdb'),
  };

  // Validate connection parameters
  return postgresConnectionSchema.parse(connection);
}
