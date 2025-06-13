import { DatabasePool } from 'slonik';
import { EventHandler } from '../../core/contracts';
/**
 * Loads all projection handlers from all domains
 * @param pool The database pool to use
 * @returns An array of event handlers
 */
export declare function loadAllProjections(pool: DatabasePool): Promise<EventHandler[]>;
