"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pathNameSchema = exports.providerNameSchema = exports.flowNameSchema = exports.postgresEnvVarsSchema = exports.postgresDsnSchema = exports.postgresConnectionSchema = void 0;
//src/tools/setup/shared/validation.ts
/**
 * Validation schemas using Zod
 */
const zod_1 = require("zod");
/**
 * PostgreSQL connection parameters schema
 */
exports.postgresConnectionSchema = zod_1.z.object({
    host: zod_1.z.string().min(1, 'Host is required'),
    port: zod_1.z.number().int().positive().default(5432),
    user: zod_1.z.string().min(1, 'User is required'),
    password: zod_1.z.string().optional(),
    database: zod_1.z.string().min(1, 'Database name is required'),
});
/**
 * PostgreSQL connection string (DSN) schema
 * Format: postgres://user:password@host:port/database
 */
exports.postgresDsnSchema = zod_1.z
    .string()
    .regex(/^postgres:\/\/([^:]+)(:[^@]+)?@([^:]+)(:(\d+))?\/(.+)$/, 'Invalid PostgreSQL connection string. Expected format: postgres://user:password@host:port/database')
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
exports.postgresEnvVarsSchema = zod_1.z.object({
    LOCAL_DB_HOST: zod_1.z.string().min(1, 'LOCAL_DB_HOST is required'),
    LOCAL_DB_PORT: zod_1.z.string().regex(/^\d+$/, 'LOCAL_DB_PORT must be a number').transform(Number).default('5432'),
    LOCAL_DB_USER: zod_1.z.string().min(1, 'LOCAL_DB_USER is required'),
    LOCAL_DB_PASSWORD: zod_1.z.string().optional(),
    LOCAL_DB_NAME: zod_1.z.string().min(1, 'LOCAL_DB_NAME is required'),
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
exports.flowNameSchema = zod_1.z.string().min(1, 'Flow name is required');
/**
 * Provider name schema
 */
exports.providerNameSchema = zod_1.z.string().min(1, 'Provider name is required');
/**
 * Path name schema
 */
exports.pathNameSchema = zod_1.z.string().min(1, 'Path name is required');
//# sourceMappingURL=validation.js.map