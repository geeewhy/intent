import { Pool } from 'pg';
export declare function runMigrations(argv?: string[], existingPool?: Pool): Promise<void>;
