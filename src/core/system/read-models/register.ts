//src/core/system/read-models/register.ts
import { DatabasePool } from 'slonik';
import { EventHandler } from '../../contracts';
import { createPgUpdaterFor } from '../../../infra/projections/pg-updater';
import { createSystemStatusProjection, projectionMeta } from './system-status.projection';

/**
 * Registers all projection handlers for the system slice
 * @param pool The database pool to use
 * @returns An array of event handlers
 */
export function registerSystemProjections(pool: DatabasePool): EventHandler[] {
  const updater = createPgUpdaterFor(projectionMeta.table, pool);
  return [createSystemStatusProjection(updater)];
}