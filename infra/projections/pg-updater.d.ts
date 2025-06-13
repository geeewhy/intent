import { ReadModelUpdaterPort } from '../../core/contracts';
import type { DatabasePool } from 'slonik';
export declare function createPgUpdaterFor<T>(tableName: string, pool: DatabasePool): ReadModelUpdaterPort<T>;
