//src/core/system/read-models/register.ts
import { DatabasePool } from 'slonik';
import { EventHandler, ReadModelUpdaterPort } from '../../../contracts';
import { createPgUpdaterFor } from '../../../../infra/projections/pg-updater';
import { createSystemStatusProjection, projectionMeta } from './system-status.projection';
import { registerProjection } from '../../../registry';

/**
 * Registers all projection definitions for the system slice
 */
export function register(): void {
  // Register the projection definition in the central registry
  registerProjection('systemStatus', {
    tables: [...projectionMeta.tables],
    eventTypes: [...projectionMeta.eventTypes],
    factory: createSystemStatusProjection
  });
}

/**
 * Creates projection handlers for the system slice
 * @param pool The database pool to use
 * @returns An array of event handlers
 */
export function registerSystemProjections(pool: DatabasePool): EventHandler[] {
  // Create a cache of updaters for each table
  const updaterCache: Record<string, ReadModelUpdaterPort<any>> = {};

  // Create an updater for each table that has migration files
  const tablesWithMigrations = ['system_status', 'system_metrics'];

  for (const { name } of projectionMeta.tables) {
    if (tablesWithMigrations.includes(name)) {
      updaterCache[name] = createPgUpdaterFor(name, pool);
    }
  }

  // Create a getUpdater function
  const getUpdater = (tableName: string) => {
    const updater = updaterCache[tableName];
    if (!updater) {
      console.warn(`No updater found for table ${tableName}, using no-op updater`);
      // Return a no-op updater for tables that don't have migration files
      return {
        async upsert() { /* no-op */ },
        async remove() { /* no-op */ }
      };
    }
    return updater;
  };

  // Create the projection handler
  const projection = createSystemStatusProjection(getUpdater);

  return [projection];
}

/**
 * Exports the projection metadata(s) for easy access
 */
export { projectionMeta };
