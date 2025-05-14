import { DatabasePool } from 'slonik';
import { EventHandler } from '../../contracts';
import { createPgUpdaterFor } from '../../../infra/projections/pg-updater';
import { createSystemStatusProjection } from './system-status.projection';

/**
 * Registers all projection handlers for the system slice
 * @param pool The database pool to use
 * @returns An array of event handlers
 */
export function registerSystemProjections(pool: DatabasePool): EventHandler[] {
  const updater = createPgUpdaterFor('system_status', pool);
  return [createSystemStatusProjection(updater)];
}