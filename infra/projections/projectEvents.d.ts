import { DatabasePool } from 'slonik';
import { Event } from '../../core/contracts';
/**
 * Projects events to read models
 * @param events  Event batch
 * @param pool    Slonik DatabasePool supplied by caller
 */
export declare function projectEvents(events: Event[], pool: DatabasePool): Promise<void>;
