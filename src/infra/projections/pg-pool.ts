//src/infra/projections/pg-pool.ts
import { createPool as createSlonikPool } from 'slonik';

/**
 * Creates a Slonik database pool with the given configuration
 * @param connectionConfig Optional connection configuration
 * @returns A Slonik database pool
 */
export function createPool(connectionConfig?: any) {
  const connectionString = connectionConfig?.connectionString || 
    `postgres://${process.env.LOCAL_DB_USER || 'postgres'}:${process.env.LOCAL_DB_PASSWORD || 'postgres'}@${process.env.LOCAL_DB_HOST || 'localhost'}:${process.env.LOCAL_DB_PORT || '5432'}/${process.env.LOCAL_DB_NAME || 'postgres'}`;
  
  return createSlonikPool(connectionString);
}