//src/infra/projections/loadProjections.ts
import { DatabasePool } from 'slonik';
import { EventHandler } from '../../core/contracts';

/**
 * Dynamically loads all projection handlers from all slices
 * @param pool The database pool to use
 * @returns An array of event handlers
 */
export async function loadAllProjections(pool: DatabasePool): Promise<EventHandler[]> {
  const slices = await Promise.all([
    import('../../core/system/read-models/register').then(r => r.registerSystemProjections(pool)),
    // Add more slices here as they are implemented
  ]);
  
  return slices.flat();
}