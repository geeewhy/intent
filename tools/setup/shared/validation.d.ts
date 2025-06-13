/**
 * Validation schemas using Zod
 */
import { z } from 'zod';
/**
 * PostgreSQL connection parameters schema
 */
export declare const postgresConnectionSchema: z.ZodObject<{
    host: z.ZodString;
    port: z.ZodDefault<z.ZodNumber>;
    user: z.ZodString;
    password: z.ZodOptional<z.ZodString>;
    database: z.ZodString;
}, "strip", z.ZodTypeAny, {
    host: string;
    user: string;
    database: string;
    port: number;
    password?: string | undefined;
}, {
    host: string;
    user: string;
    database: string;
    password?: string | undefined;
    port?: number | undefined;
}>;
/**
 * Type for PostgreSQL connection parameters
 */
export type PostgresConnection = z.infer<typeof postgresConnectionSchema>;
/**
 * PostgreSQL connection string (DSN) schema
 * Format: postgres://user:password@host:port/database
 */
export declare const postgresDsnSchema: z.ZodEffects<z.ZodString, {
    host: string;
    port: number;
    user: string;
    password: string | undefined;
    database: string;
}, string>;
/**
 * Environment variables schema for PostgreSQL connection
 */
export declare const postgresEnvVarsSchema: z.ZodEffects<z.ZodObject<{
    LOCAL_DB_HOST: z.ZodString;
    LOCAL_DB_PORT: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    LOCAL_DB_USER: z.ZodString;
    LOCAL_DB_PASSWORD: z.ZodOptional<z.ZodString>;
    LOCAL_DB_NAME: z.ZodString;
}, "strip", z.ZodTypeAny, {
    LOCAL_DB_HOST: string;
    LOCAL_DB_PORT: number;
    LOCAL_DB_USER: string;
    LOCAL_DB_NAME: string;
    LOCAL_DB_PASSWORD?: string | undefined;
}, {
    LOCAL_DB_HOST: string;
    LOCAL_DB_USER: string;
    LOCAL_DB_NAME: string;
    LOCAL_DB_PORT?: string | undefined;
    LOCAL_DB_PASSWORD?: string | undefined;
}>, {
    host: string;
    port: number;
    user: string;
    password: string | undefined;
    database: string;
}, {
    LOCAL_DB_HOST: string;
    LOCAL_DB_USER: string;
    LOCAL_DB_NAME: string;
    LOCAL_DB_PORT?: string | undefined;
    LOCAL_DB_PASSWORD?: string | undefined;
}>;
/**
 * Flow name schema
 */
export declare const flowNameSchema: z.ZodString;
/**
 * Provider name schema
 */
export declare const providerNameSchema: z.ZodString;
/**
 * Path name schema
 */
export declare const pathNameSchema: z.ZodString;
