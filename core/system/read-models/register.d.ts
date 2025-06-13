import { DatabasePool } from 'slonik';
import { EventHandler } from '../../contracts';
import { projectionMeta } from './system-status.projection';
/**
 * Registers all projection definitions for the system slice
 */
export declare function register(): void;
/**
 * Creates projection handlers for the system slice
 * @param pool The database pool to use
 * @returns An array of event handlers
 */
export declare function registerSystemProjections(pool: DatabasePool): EventHandler[];
/**
 * Exports the projection metadata(s) for easy access
 */
export { projectionMeta };
