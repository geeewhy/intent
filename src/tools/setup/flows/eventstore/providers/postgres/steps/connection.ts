//src/tools/setup/flows/eventstore/providers/postgres/steps/connection.ts
/**
 * Set up database connection
 */
import { FlowCtx } from '../../../../../shared/types';
import { promptText, promptYesNo } from '../../../../../shared/prompt';
import { postgresConnectionSchema, PostgresConnection } from '../../../../../shared/validation';
import fs from 'fs/promises';
import path from 'node:path';
import pg from 'pg';

/**
 * Set up database connection
 * @param ctx Flow context
 */
export default async function step(ctx: FlowCtx): Promise<void> {
  ctx.logger.info('Setting up database connection');

  // Get connection parameters
  const connection = await getConnectionParameters(ctx);

  // Create connection pool
  ctx.logger.info(`Connecting to PostgreSQL at ${connection.host}:${connection.port}`);
  const pool = new pg.Pool({
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
  } catch (error) {
    ctx.logger.error(`Failed to connect to PostgreSQL: ${(error as Error).message}`);
    throw error;
  }

  // Store connection pool in context for use by other steps
  ctx.vars.pool = pool;
  ctx.vars.connection = connection;

  // Generate environment file
  await generateEnvFile(ctx, connection);

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
      database: 'eventstore',
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
    database: await promptText('Database:', 'eventstore'),
  };

  // Validate connection parameters
  return postgresConnectionSchema.parse(connection);
}

/**
 * Generate environment file from template
 * @param ctx Flow context
 * @param connection Connection parameters
 */
async function generateEnvFile(ctx: FlowCtx, connection: PostgresConnection): Promise<void> {
  const templatePath = path.join(ctx.artifactsDir, 'templates', 'postgres.env_template');
  // Use a different file name for test environment
  const envPath = process.env.NODE_ENV === 'test' 
    ? path.join(process.cwd(), '.env_test_generated')
    : path.join(process.cwd(), '.env.local');

  // Read template
  const template = await fs.readFile(templatePath, 'utf-8');

  // Replace placeholders
  const envContent = template
    .replace('{{LOCAL_DB_HOST}}', connection.host)
    .replace('{{LOCAL_DB_PORT}}', String(connection.port))
    .replace('{{LOCAL_DB_USER}}', connection.user)
    .replace('{{LOCAL_DB_PASSWORD}}', connection.password || '')
    .replace('{{LOCAL_DB_NAME}}', connection.database);

  // Check if .env.local already exists
  try {
    await fs.access(envPath);

    // If --yes flag is set, automatically overwrite
    // Check both ctx.vars.yes and process.argv for --yes or -Y
    const hasYesFlag = ctx.vars.yes || process.argv.includes('--yes') || process.argv.includes('-Y');

    if (hasYesFlag) {
      ctx.logger.info('Automatically overwriting .env.local (--yes flag is set)');
    } else {
      // Ask if we should overwrite
      const overwrite = await promptYesNo(
        '.env.local already exists. Overwrite?',
        false
      );

      if (!overwrite) {
        ctx.logger.info('Skipping environment file generation');
        return;
      }
    }
  } catch (error) {
    // File doesn't exist, continue
  }

  // Write an environment file
  await fs.writeFile(envPath, envContent);
  ctx.logger.info(`Environment file generated at ${envPath}`);
}
