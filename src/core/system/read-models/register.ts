//src/core/system/read-models/register.ts
import { DatabasePool } from 'slonik';
import { EventHandler } from '../../contracts';
import { createPgUpdaterFor } from '../../../infra/projections/pg-updater';
import { createSystemStatusProjection, projectionMeta } from './system-status.projection';
import { registerProjection } from '../../registry';

/**
 * Registers all projection definitions for the system slice
 */
export function register(): void {
  // Register the projection definition in the central registry
  registerProjection('systemStatus', {
    meta: projectionMeta,
    factory: createSystemStatusProjection
  });
}

/**
 * Creates projection handlers for the system slice
 * @param pool The database pool to use
 * @returns An array of event handlers
 */
export function registerSystemProjections(pool: DatabasePool): EventHandler[] {
  const updater = createPgUpdaterFor(projectionMeta.table, pool);
  const projection = createSystemStatusProjection(updater);
  return [projection];
}

/**
 * Exports the projection metadata(s) for easy access
 */
export { projectionMeta };
