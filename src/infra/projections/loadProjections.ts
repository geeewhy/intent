//src/infra/projections/loadProjections.ts
import { DatabasePool } from 'slonik';
import { EventHandler } from '../../core/contracts';
import { initializeCore } from '../../core/initialize';

void initializeCore();

/**
 * Loads all projection handlers from all domains
 * @param pool The database pool to use
 * @returns An array of event handlers
 */
export async function loadAllProjections(pool: DatabasePool): Promise<EventHandler[]> {
  console.log('Loading all projections...');

  // Import the registry to ensure all domains are registered
  const { getAllProjections } = await import('../../core/registry');

  // Get all projection definitions from the registry
  const defs = Object.values(getAllProjections());

  // Create updaters and materialize projections
  const { createPgUpdaterFor } = await import('./pg-updater');

  // Materialize projections from definitions
  return defs.map(def => {
    const updater = createPgUpdaterFor(def.meta.table, pool);
    return def.factory(updater);
  });
}
