//src/tools/setup/shared/validation.ts
/**
 * Validation schemas using Zod
 */
import { z } from 'zod';

/**
 * PostgreSQL connection parameters schema
 */
export const postgresConnectionSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.number().int().positive().default(5432),
  user: z.string().min(1, 'User is required'),
  password: z.string().optional(),
  database: z.string().min(1, 'Database name is required'),
});

/**
 * Type for PostgreSQL connection parameters
 */
export type PostgresConnection = z.infer<typeof postgresConnectionSchema>;

/**
 * PostgreSQL connection string (DSN) schema
 * Format: postgres://user:password@host:port/database
 */
export const postgresDsnSchema = z
  .string()
  .regex(
    /^postgres:\/\/([^:]+)(:[^@]+)?@([^:]+)(:(\d+))?\/(.+)$/,
    'Invalid PostgreSQL connection string. Expected format: postgres://user:password@host:port/database'
  )
  .transform((dsn) => {
    const match = dsn.match(/^postgres:\/\/([^:]+)(:[^@]+)?@([^:]+)(:(\d+))?\/(.+)$/);
    if (!match) {
      throw new Error('Invalid PostgreSQL connection string');
    }

    const [, user, passwordWithColon, host, , portStr, database] = match;
    const password = passwordWithColon ? passwordWithColon.substring(1) : undefined;
    const port = portStr ? parseInt(portStr, 10) : 5432;

    return {
      host,
      port,
      user,
      password,
      database,
    };
  });

/**
 * Environment variables schema for PostgreSQL connection
 */
export const postgresEnvVarsSchema = z.object({
  LOCAL_DB_HOST: z.string().min(1, 'LOCAL_DB_HOST is required'),
  LOCAL_DB_PORT: z.string().regex(/^\d+$/, 'LOCAL_DB_PORT must be a number').transform(Number).default('5432'),
  LOCAL_DB_USER: z.string().min(1, 'LOCAL_DB_USER is required'),
  LOCAL_DB_PASSWORD: z.string().optional(),
  LOCAL_DB_NAME: z.string().min(1, 'LOCAL_DB_NAME is required'),
}).transform(({ LOCAL_DB_HOST, LOCAL_DB_PORT, LOCAL_DB_USER, LOCAL_DB_PASSWORD, LOCAL_DB_NAME }) => ({
  host: LOCAL_DB_HOST,
  port: LOCAL_DB_PORT,
  user: LOCAL_DB_USER,
  password: LOCAL_DB_PASSWORD,
  database: LOCAL_DB_NAME,
}));

/**
 * Flow name schema
 */
export const flowNameSchema = z.string().min(1, 'Flow name is required');

/**
 * Provider name schema
 */
export const providerNameSchema = z.string().min(1, 'Provider name is required');

/**
 * Path name schema
 */
export const pathNameSchema = z.string().min(1, 'Path name is required');
